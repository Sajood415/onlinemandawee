import "server-only";

import {
  normalizeGuestCheckoutCoupons,
  type GuestCheckoutCouponEntry,
} from "@/lib/checkout/coupon-entry";
import { getCouponEligibleSubtotal } from "@/lib/vendor-coupon/product-scope";
import { applyQuoteCurrency } from "@/lib/currency/apply-quote-currency";
import { convertMinorUnits } from "@/lib/currency/convert";
import { GuestCheckoutQuoteError } from "@/lib/checkout/guest-checkout-quote-error";
import {
  calculateGuestDelivery,
  type GuestCheckoutDeliveryBreakdown,
} from "@/lib/delivery/calculate-guest-delivery";
import { prisma } from "@/lib/db/prisma";
import { isMongoObjectId } from "@/lib/db/object-id";
import type { PostalAddress } from "@/lib/maps/google-maps";
import type { DeliveryMethod } from "@/domain/delivery/delivery-types";
import type { SellerType } from "@/domain/vendor/vendor-types";
import { DeliveryPricingService } from "@/services/delivery-pricing.service";

export type GuestCheckoutCartItem = {
  productId: string;
  quantity: number;
};

export type GuestCheckoutLineItem = {
  productId: string;
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
  const couponEntries = normalizeGuestCheckoutCoupons({
    vendorCoupons: input.vendorCoupons,
    couponCodes: input.couponCodes,
  });
  const deliveryPricingService = new DeliveryPricingService();
  const selectedThirdPartyMethod: DeliveryMethod = input.deliveryMethod ?? "STANDARD";

  const products = await Promise.all(
    input.items.map(async (item) => {
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

  const lineItems: GuestCheckoutLineItem[] = products.map(({ item, product }) => {
    const nativeCurrency = product!.currency || "USD";
    const unitPriceAmount = convertMinorUnits(
      product!.priceAmount,
      nativeCurrency,
      currency
    );
    return {
      productId: product!.id,
      productName: product!.name,
      productImage: product!.images[0] ?? null,
      productSku: product!.sku ?? null,
      vendorProfileId: product!.vendorProfileId,
      sellerType: product!.vendorProfile.sellerType,
      categoryId: product!.categoryId,
      quantity: item.quantity,
      unitPriceAmount,
      lineTotalAmount: unitPriceAmount * item.quantity,
      currency,
    };
  });

  const subtotalAmount = lineItems.reduce((sum, item) => sum + item.lineTotalAmount, 0);

  const hasPlatformItems = lineItems.some((item) => item.sellerType === "PLATFORM");
  const hasThirdPartyItems = lineItems.some(
    (item) => item.sellerType === "THIRD_PARTY"
  );
  const requiresDeliveryAddress =
    hasPlatformItems || selectedThirdPartyMethod !== "PICKUP";

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

  if (hasPlatformItems && input.deliveryAddress) {
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
      const thirdPartyDeliveryQuote = await deliveryPricingService.quote({
        method: selectedThirdPartyMethod,
        countryCode: input.deliveryAddress.country,
        currency,
        items: thirdPartyItems.map((item) => ({
          vendorProfileId: item.vendorProfileId,
          quantity: item.quantity,
          currentLineTotal: item.lineTotalAmount,
        })),
        vendorGroups: thirdPartyVendorGroups,
      });

      deliveryAmount += thirdPartyDeliveryQuote.totalAmount;
      for (const entry of thirdPartyDeliveryQuote.breakdown) {
        const isExpress = selectedThirdPartyMethod === "EXPRESS";
        deliveryByVendorForSettlement.set(
          entry.vendorProfileId,
          isExpress ? entry.amount : 0
        );
        const existing = breakdownEntries.find(
          (value) => value.vendorProfileId === entry.vendorProfileId
        );
        if (existing) {
          existing.deliveryAmount += entry.amount;
          continue;
        }
        breakdownEntries.push({
          vendorProfileId: entry.vendorProfileId,
          vendorStoreName: null,
          distanceKm: 0,
          baseFeeAmount: 0,
          perKmRateAmount: 0,
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
      const vendorDelivery = deliveryByVendorForSettlement.get(vendorProfileId) ?? 0;
      const sellerType = vendorSellerType.get(vendorProfileId) ?? "THIRD_PARTY";
      const vendorDeliveryMethod =
        sellerType === "PLATFORM" ? "STANDARD" : selectedThirdPartyMethod;
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
