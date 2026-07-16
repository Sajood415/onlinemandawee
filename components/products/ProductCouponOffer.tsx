import { Tag } from "lucide-react";

import type { SupportedLocale } from "@/lib/localization/product-vendor";
import type { PublicProductCoupon } from "@/lib/products/public-catalog";

export function getPrimaryProductCoupon(coupons?: PublicProductCoupon[]) {
  return coupons?.[0] ?? null;
}

export function getCouponAdjustedPrices(
  priceMajor: number,
  currency: string,
  coupon: PublicProductCoupon | null,
  formatPrice: (amount: number, currency: string) => string
) {
  if (!coupon) {
    return { current: formatPrice(priceMajor, currency), original: null as string | null };
  }

  let discountedMajor = priceMajor;
  if (coupon.discountType === "PERCENTAGE") {
    discountedMajor = priceMajor * (1 - coupon.discountValue / 100);
  } else {
    discountedMajor = Math.max(0, priceMajor - coupon.discountValue / 100);
  }

  return {
    current: formatPrice(discountedMajor, currency),
    original: formatPrice(priceMajor, currency),
  };
}

type ProductCouponOfferProps = {
  coupon: PublicProductCoupon;
  locale: SupportedLocale;
};

export function ProductCouponImageBadge({ coupon }: Pick<ProductCouponOfferProps, "coupon">) {
  const badgeLabel =
    coupon.discountType === "PERCENTAGE"
      ? `${coupon.discountValue}% OFF`
      : coupon.label.toUpperCase();

  return (
    <div className="absolute left-2 top-2 z-10">
      <span className="inline-flex items-center rounded-sm bg-[#ec1b23] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {badgeLabel}
      </span>
    </div>
  );
}

export function ProductCouponPriceHint({ coupon, locale }: ProductCouponOfferProps) {
  const checkoutHint =
    locale === "en" ? "at checkout" : locale === "ps" ? "په چک آوټ کې" : "در تسویه";

  return (
    <p className="mt-1 flex min-w-0 items-center gap-1 text-[11px] text-neutral-500">
      <Tag className="h-3 w-3 shrink-0 text-[#ec1b23]" aria-hidden />
      <span className="truncate font-mono font-semibold text-[#ec1b23]">{coupon.code}</span>
      <span aria-hidden>·</span>
      <span className="truncate">{checkoutHint}</span>
    </p>
  );
}
