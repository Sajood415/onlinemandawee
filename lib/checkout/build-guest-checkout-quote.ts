import "server-only";

import {
  normalizeGuestCheckoutCoupons,
  type GuestCheckoutCouponEntry,
} from "@/lib/checkout/coupon-entry";
import { GuestCheckoutQuoteError } from "@/lib/checkout/guest-checkout-quote-error";
import { getCouponEligibleSubtotal } from "@/lib/vendor-coupon/product-scope";
import { applyQuoteCurrency } from "@/lib/currency/apply-quote-currency";
import { convertMinorUnits } from "@/lib/currency/convert";
import {
  assertSufficientStock,
} from "@/lib/products/product-stock";
import {
  CheckoutVariantResolutionError,
  resolveCheckoutUnitPriceMinor,
  resolveCheckoutVariantSelection,
} from "@/lib/products/resolve-checkout-variant";
import {
  calculateGuestDelivery,
  getDistanceKmBetweenAddresses,
  getVendorDistancesKm,
  type GuestCheckoutDeliveryBreakdown,
} from "@/lib/delivery/calculate-guest-delivery";
import { getWarehouseAddress } from "@/lib/delivery/get-warehouse-address";
import { resolveVendorSettlementDeliveryAmount } from "@/lib/delivery/vendor-settlement-delivery";
import { prisma } from "@/lib/db/prisma";
import { isMongoObjectId } from "@/lib/db/object-id";
import type { PostalAddress } from "@/lib/maps/google-maps";
import type { DeliveryMethod } from "@/domain/delivery/delivery-types";
import type { SellerType } from "@/domain/vendor/vendor-types";
import { DeliveryRuleRepository } from "@/repositories/delivery-rule.repository";
import { DeliveryPricingService } from "@/services/delivery-pricing.service";
import {
  mergeGuestCheckoutCartItems,
  mergeLineItemsByProduct,
} from "@/lib/orders/aggregate-order-line-items";

export type GuestCheckoutCartItem = {
  productId: string;
  quantity: number;
  variantId?: string;
};

export type GuestCheckoutLineItem = {
  productId: string;
  variantId?: string | null;
  variantName?: string | null;
  productName: string;
  productImage: string | null;
  productSku: string | null;
  vendorProfileId: string;
  sellerType: SellerType;
  categoryId: string;
  quantity: number;
  unitPriceAmount: number;
  lineTotalAmount: number;
  currency: string;
};

export type AppliedGuestCoupon = {
  couponId: string;
  code: string;
  vendorProfileId: string;
  vendorStoreName: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  discountAmount: number;
};

export type GuestCheckoutVendorSummary = {
  vendorProfileId: string;
  sellerType: SellerType;
  deliveryMethod: DeliveryMethod;
  subtotalAmount: number;
  discountAmount: number;
  deliveryAmount: number;
  grandTotalAmount: number;
  couponCode: string | null;
};

export type { GuestCheckoutDeliveryBreakdown };

export type GuestCheckoutQuote = {
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  currency: string;
  lineItems: GuestCheckoutLineItem[];
  appliedCoupons: AppliedGuestCoupon[];
  vendorSummaries: GuestCheckoutVendorSummary[];
  deliveryBreakdown?: GuestCheckoutDeliveryBreakdown[];
  deliveryMethod: DeliveryMethod;
  requiresDeliveryAddress: boolean;
};

export { GuestCheckoutQuoteError };

const productInclude = {
  vendorProfile: true,
  category: true,
  variants: {
    where: { isActive: true },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

async function resolveCheckoutProduct(productId: string) {
  if (isMongoObjectId(productId)) {
    return prisma.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });
  }

  return prisma.product.findFirst({
    where: { slug: productId },
    include: productInclude,
  });
}

const calculateVendorDiscount = (
  subtotalAmount: number,
  discountType: "PERCENTAGE" | "FIXED_AMOUNT",
  discountValue: number
) => {
  if (discountType === "PERCENTAGE") {
    return Math.min(subtotalAmount, Math.floor((subtotalAmount * discountValue) / 100));
  }
  return Math.min(subtotalAmount, discountValue);
};

export async function buildGuestCheckoutQuote(input: {
  items: GuestCheckoutCartItem[];
  currency?: string;
  /** @deprecated Prefer vendorCoupons so codes are validated per vendor. */
  couponCodes?: string[];
  vendorCoupons?: GuestCheckoutCouponEntry[];
  deliveryAddress?: PostalAddress;
  deliveryMethod?: DeliveryMethod;
}): Promise<GuestCheckoutQuote> {
  const currency = input.currency ?? "USD";
  const cartItems = mergeGuestCheckoutCartItems(input.items);
  const couponEntries = normalizeGuestCheckoutCoupons({
    vendorCoupons: input.vendorCoupons,
    couponCodes: input.couponCodes,
  });
  const deliveryPricingService = new DeliveryPricingService();
  const deliveryRuleRepository = new DeliveryRuleRepository();
  const selectedThirdPartyMethod: DeliveryMethod = input.deliveryMethod ?? "STANDARD";

  const products = await Promise.all(
    cartItems.map(async (item) => {
      const product = await resolveCheckoutProduct(item.productId);
      return { item, product };
    })
  );

  const unavailable = products.filter(
    ({ product }) =>
      !product ||
      product.approvalStatus !== "APPROVED" ||
      !product.isActive ||
      product.vendorProfile.status !== "ACTIVE"
  );

  if (unavailable.length > 0) {
    throw new GuestCheckoutQuoteError(
      "UNAVAILABLE_ITEMS",
      "Some items in your cart are no longer available. Remove outdated items and add products from a vendor store, then try again."
    );
  }

  for (const { item, product } of products) {
    let variantId: string | null;
    try {
      variantId = resolveCheckoutVariantSelection({
        variants: product!.variants,
        requestedVariantId: item.variantId,
        productName: product!.name,
      }).variantId;
    } catch (error) {
      if (error instanceof CheckoutVariantResolutionError) {
        throw new GuestCheckoutQuoteError("VARIANT_REQUIRED", error.message);
      }
      throw error;
    }

    const stockCheck = assertSufficientStock(product!, item.quantity, variantId ?? undefined);
    if (!stockCheck.ok) {
      throw new GuestCheckoutQuoteError("INSUFFICIENT_STOCK", `${product!.name}: ${stockCheck.message}`);
    }
  }

  const lineItems = mergeLineItemsByProduct(
    products.map(({ item, product }) => {
    const { variant: selectedVariant, variantId } = resolveCheckoutVariantSelection({
      variants: product!.variants,
      requestedVariantId: item.variantId,
      productName: product!.name,
    });
    const nativeCurrency = product!.currency || "USD";
    const nativeUnitPrice = resolveCheckoutUnitPriceMinor({
      basePriceAmount: product!.priceAmount,
      variants: product!.variants,
      variantId,
      productName: product!.name,
    });
    const unitPriceAmount = convertMinorUnits(nativeUnitPrice, nativeCurrency, currency);
    return {
      productId: product!.id,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      productName: product!.name,
      productImage: product!.images[0] ?? null,
      productSku: selectedVariant?.sku ?? product!.sku ?? null,
      vendorProfileId: product!.vendorProfileId,
      sellerType: product!.vendorProfile.sellerType,
      categoryId: product!.categoryId,
      quantity: item.quantity,
      unitPriceAmount,
      lineTotalAmount: unitPriceAmount * item.quantity,
      currency,
    };
  })
  );

  const subtotalAmount = lineItems.reduce((sum, item) => sum + item.lineTotalAmount, 0);

  const hasPlatformItems = lineItems.some((item) => item.sellerType === "PLATFORM");
  const hasThirdPartyItems = lineItems.some(
    (item) => item.sellerType === "THIRD_PARTY"
  );
  const requiresDeliveryAddress = selectedThirdPartyMethod !== "PICKUP";

  if (requiresDeliveryAddress && !input.deliveryAddress) {
    throw new GuestCheckoutQuoteError(
      "DELIVERY_ADDRESS_REQUIRED",
      "Delivery address is required for this order.",
      400
    );
  }

  let deliveryAmount = 0;
  let deliveryBreakdown: GuestCheckoutDeliveryBreakdown[] | undefined;

  const deliveryByVendorForSettlement = new Map<string, number>();
  const breakdownEntries: GuestCheckoutDeliveryBreakdown[] = [];

  // Platform shop: charge warehouse delivery when shipping; Pickup = no fee / no address.
  if (
    hasPlatformItems &&
    input.deliveryAddress &&
    selectedThirdPartyMethod !== "PICKUP"
  ) {
    const platformVendorIds = [
      ...new Set(
        lineItems
          .filter((item) => item.sellerType === "PLATFORM")
          .map((item) => item.vendorProfileId)
      ),
    ];

    if (platformVendorIds.length > 0) {
      const platformDeliveryQuote = await calculateGuestDelivery({
        vendorProfileIds: platformVendorIds,
        deliveryAddress: input.deliveryAddress,
      });
      deliveryAmount += platformDeliveryQuote.totalAmount;
      for (const entry of platformDeliveryQuote.breakdown) {
        deliveryByVendorForSettlement.set(entry.vendorProfileId, entry.deliveryAmount);
        breakdownEntries.push(entry);
      }
    }
  }

  if (hasThirdPartyItems) {
    const thirdPartyItems = lineItems.filter(
      (item) => item.sellerType === "THIRD_PARTY"
    );
    const thirdPartyVendorGroups = Object.values(
      thirdPartyItems.reduce<Record<string, { vendorProfileId: string; subtotalCurrent: number }>>(
        (acc, item) => {
          acc[item.vendorProfileId] ??= {
            vendorProfileId: item.vendorProfileId,
            subtotalCurrent: 0,
          };
          acc[item.vendorProfileId].subtotalCurrent += item.lineTotalAmount;
          return acc;
        },
        {}
      )
    );

    if (selectedThirdPartyMethod === "PICKUP") {
      for (const vendorGroup of thirdPartyVendorGroups) {
        deliveryByVendorForSettlement.set(vendorGroup.vendorProfileId, 0);
      }
    } else if (input.deliveryAddress) {
      let vendorDistances: Map<string, { distanceKm: number; vendorStoreName: string | null }> | null =
        null;
      let sharedDistanceKm: number | undefined;

      if (selectedThirdPartyMethod === "EXPRESS") {
        const activeExpressRules = await deliveryRuleRepository.listActiveByMethod("EXPRESS");
        const needsDistance = activeExpressRules.some(
          (rule) => rule.priceModel === "PER_KM"
        );
        if (needsDistance) {
          vendorDistances = await getVendorDistancesKm(
            thirdPartyVendorGroups.map((vendorGroup) => vendorGroup.vendorProfileId),
            input.deliveryAddress
          );
        }
      } else if (selectedThirdPartyMethod === "STANDARD") {
        // STANDARD ships as one consolidated shipment from Mandawee's
        // warehouse, so a single warehouse → customer distance applies.
        const activeStandardRules = await deliveryRuleRepository.listActiveByMethod("STANDARD");
        const needsDistance = activeStandardRules.some(
          (rule) => rule.priceModel === "PER_KM"
        );
        if (needsDistance) {
          const warehouseAddress = await getWarehouseAddress();
          if (!warehouseAddress) {
            throw new GuestCheckoutQuoteError(
              "WAREHOUSE_ADDRESS_MISSING",
              "Delivery cannot be calculated because the warehouse pickup address has not been configured yet. Please contact support.",
              400
            );
          }
          sharedDistanceKm = await getDistanceKmBetweenAddresses(
            warehouseAddress,
            input.deliveryAddress
          );
        }
      }

      const thirdPartyDeliveryQuote = await deliveryPricingService.quote({
        method: selectedThirdPartyMethod,
        countryCode: input.deliveryAddress.country,
        currency,
        distanceKm: sharedDistanceKm,
        items: thirdPartyItems.map((item) => ({
          vendorProfileId: item.vendorProfileId,
          quantity: item.quantity,
          currentLineTotal: item.lineTotalAmount,
        })),
        vendorGroups: thirdPartyVendorGroups.map((vendorGroup) => ({
          ...vendorGroup,
          distanceKm: vendorDistances?.get(vendorGroup.vendorProfileId)?.distanceKm,
        })),
      });

      deliveryAmount += thirdPartyDeliveryQuote.totalAmount;
      for (const entry of thirdPartyDeliveryQuote.breakdown) {
        // STANDARD fee is charged to the customer but settles to Mandawee, not the vendor.
        deliveryByVendorForSettlement.set(
          entry.vendorProfileId,
          resolveVendorSettlementDeliveryAmount({
            deliveryMethod: selectedThirdPartyMethod,
            quotedDeliveryAmount: entry.amount,
            sellerType: "THIRD_PARTY",
          })
        );
        const existing = breakdownEntries.find(
          (value) => value.vendorProfileId === entry.vendorProfileId
        );
        if (existing) {
          existing.deliveryAmount += entry.amount;
          if (entry.distanceKm > 0) existing.distanceKm = entry.distanceKm;
          if (entry.baseFeeAmount > 0) existing.baseFeeAmount = entry.baseFeeAmount;
          if (entry.perKmRateAmount > 0) existing.perKmRateAmount = entry.perKmRateAmount;
          continue;
        }
        breakdownEntries.push({
          vendorProfileId: entry.vendorProfileId,
          vendorStoreName: vendorDistances?.get(entry.vendorProfileId)?.vendorStoreName ?? null,
          distanceKm: entry.distanceKm,
          baseFeeAmount: entry.baseFeeAmount,
          perKmRateAmount: entry.perKmRateAmount,
          deliveryAmount: entry.amount,
        });
      }
    }
  }

  if (breakdownEntries.length > 0) {
    deliveryBreakdown = breakdownEntries;
  }

  const vendorSubtotals = lineItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.vendorProfileId] = (acc[item.vendorProfileId] ?? 0) + item.lineTotalAmount;
    return acc;
  }, {});

  const appliedCoupons: AppliedGuestCoupon[] = [];
  const vendorDiscounts: Record<string, { amount: number; code: string }> = {};

  for (const entry of couponEntries) {
    const { code, vendorProfileId } = entry;
    const coupon = await prisma.vendorCoupon.findFirst({
      where: { code, vendorProfileId },
      include: { vendorProfile: true },
    });

    if (!coupon) {
      throw new GuestCheckoutQuoteError(
        "INVALID_COUPON",
        `Coupon "${code}" is not valid for this store.`
      );
    }

    if (!coupon.isActive) {
      throw new GuestCheckoutQuoteError("INACTIVE_COUPON", `Coupon "${code}" is no longer active.`);
    }

    if (coupon.vendorProfile.status !== "ACTIVE") {
      throw new GuestCheckoutQuoteError("INVALID_COUPON", `Coupon "${code}" is not valid.`);
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new GuestCheckoutQuoteError("COUPON_NOT_STARTED", `Coupon "${code}" is not active yet.`);
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new GuestCheckoutQuoteError("COUPON_EXPIRED", `Coupon "${code}" has expired.`);
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new GuestCheckoutQuoteError("COUPON_EXHAUSTED", `Coupon "${code}" has reached its usage limit.`);
    }

    const couponScope = {
      appliesToAllProducts: coupon.appliesToAllProducts ?? true,
      productIds: coupon.productIds ?? [],
    };
    const eligibleSubtotal = getCouponEligibleSubtotal(
      lineItems,
      coupon.vendorProfileId,
      couponScope
    );

    if (eligibleSubtotal <= 0) {
      throw new GuestCheckoutQuoteError(
        "COUPON_NO_MATCHING_ITEMS",
        `Coupon "${code}" does not apply to the products in your cart.`
      );
    }

    if (coupon.minOrderAmount != null && eligibleSubtotal < coupon.minOrderAmount) {
      throw new GuestCheckoutQuoteError(
        "COUPON_MIN_NOT_MET",
        `Coupon "${code}" requires a minimum of $${(coupon.minOrderAmount / 100).toFixed(2)} on eligible products.`
      );
    }

    if (vendorDiscounts[coupon.vendorProfileId]) {
      throw new GuestCheckoutQuoteError(
        "COUPON_ALREADY_APPLIED",
        `Only one coupon can be applied per vendor. "${vendorDiscounts[coupon.vendorProfileId].code}" is already applied.`
      );
    }

    const discountAmount = calculateVendorDiscount(
      eligibleSubtotal,
      coupon.discountType,
      coupon.discountValue
    );

    vendorDiscounts[coupon.vendorProfileId] = { amount: discountAmount, code: coupon.code };
    appliedCoupons.push({
      couponId: coupon.id,
      code: coupon.code,
      vendorProfileId: coupon.vendorProfileId,
      vendorStoreName: coupon.vendorProfile.storeName,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    });
  }

  const discountAmount = appliedCoupons.reduce((sum, coupon) => sum + coupon.discountAmount, 0);
  const grandTotalAmount = Math.max(0, subtotalAmount + deliveryAmount - discountAmount);

  const vendorSellerType = new Map<string, SellerType>();
  for (const item of lineItems) {
    vendorSellerType.set(item.vendorProfileId, item.sellerType);
  }
  const vendorStoreName = new Map<string, string | null>();
  for (const product of products) {
    if (product.product) {
      vendorStoreName.set(
        product.product.vendorProfileId,
        product.product.vendorProfile.storeName
      );
    }
  }
  for (const entry of deliveryBreakdown ?? []) {
    if (!entry.vendorStoreName) {
      entry.vendorStoreName = vendorStoreName.get(entry.vendorProfileId) ?? null;
    }
  }

  const vendorSummaries: GuestCheckoutVendorSummary[] = Object.entries(vendorSubtotals).map(
    ([vendorProfileId, vendorSubtotal]) => {
      const discount = vendorDiscounts[vendorProfileId]?.amount ?? 0;
      const couponCode = vendorDiscounts[vendorProfileId]?.code ?? null;
      const sellerType = vendorSellerType.get(vendorProfileId) ?? "THIRD_PARTY";
      // Same customer choice for Mandawee shop and outside sellers (incl. Pickup for everyone).
      const vendorDeliveryMethod = selectedThirdPartyMethod;
      const vendorDelivery = resolveVendorSettlementDeliveryAmount({
        deliveryMethod: vendorDeliveryMethod,
        quotedDeliveryAmount:
          deliveryByVendorForSettlement.get(vendorProfileId) ?? 0,
        sellerType,
      });
      return {
        vendorProfileId,
        sellerType,
        deliveryMethod: vendorDeliveryMethod,
        subtotalAmount: vendorSubtotal,
        discountAmount: discount,
        deliveryAmount: vendorDelivery,
        grandTotalAmount: Math.max(0, vendorSubtotal + vendorDelivery - discount),
        couponCode,
      };
    }
  );

  const quote: GuestCheckoutQuote = {
    subtotalAmount,
    deliveryAmount,
    discountAmount,
    grandTotalAmount,
    currency,
    lineItems,
    appliedCoupons,
    vendorSummaries,
    deliveryBreakdown,
    deliveryMethod: selectedThirdPartyMethod,
    requiresDeliveryAddress,
  };

  return applyQuoteCurrency(quote, currency);
}

export async function incrementCouponUsage(couponIds: string[]) {
  if (couponIds.length === 0) return;

  await Promise.all(
    couponIds.map((couponId) =>
      prisma.vendorCoupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      })
    )
  );
}
