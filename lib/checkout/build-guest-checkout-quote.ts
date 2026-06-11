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
}): Promise<GuestCheckoutQuote> {
  const currency = input.currency ?? "USD";
  const couponEntries = normalizeGuestCheckoutCoupons({
    vendorCoupons: input.vendorCoupons,
    couponCodes: input.couponCodes,
  });

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
      categoryId: product!.categoryId,
      quantity: item.quantity,
      unitPriceAmount,
      lineTotalAmount: unitPriceAmount * item.quantity,
      currency,
    };
  });

  const subtotalAmount = lineItems.reduce((sum, item) => sum + item.lineTotalAmount, 0);

  const vendorProfileIds = [...new Set(lineItems.map((item) => item.vendorProfileId))];
  let deliveryAmount = 0;
  let deliveryBreakdown: GuestCheckoutDeliveryBreakdown[] | undefined;

  if (input.deliveryAddress) {
    const deliveryQuote = await calculateGuestDelivery({
      vendorProfileIds,
      deliveryAddress: input.deliveryAddress,
    });
    deliveryAmount = deliveryQuote.totalAmount;
    deliveryBreakdown = deliveryQuote.breakdown;
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

  const deliveryByVendor = new Map(
    (deliveryBreakdown ?? []).map((entry) => [entry.vendorProfileId, entry.deliveryAmount])
  );

  const vendorSummaries: GuestCheckoutVendorSummary[] = Object.entries(vendorSubtotals).map(
    ([vendorProfileId, vendorSubtotal]) => {
      const discount = vendorDiscounts[vendorProfileId]?.amount ?? 0;
      const couponCode = vendorDiscounts[vendorProfileId]?.code ?? null;
      const vendorDelivery = deliveryByVendor.get(vendorProfileId) ?? 0;
      return {
        vendorProfileId,
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
