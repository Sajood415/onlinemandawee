import "server-only";

import { couponAppliesToProduct } from "@/lib/vendor-coupon/product-scope";
import { prisma } from "@/lib/db/prisma";

function isCouponCurrentlyValid(coupon: {
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
}) {
  if (!coupon.isActive) return false;
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return false;
  if (coupon.expiresAt && coupon.expiresAt < now) return false;
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return false;
  return true;
}

export type PublicVendorCouponOffer = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderAmount: number | null;
  label: string;
  appliesToAllProducts: boolean;
  scopeLabel: string;
};

function formatCouponLabel(coupon: {
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  appliesToAllProducts: boolean;
}) {
  const discountLabel =
    coupon.discountType === "PERCENTAGE"
      ? `${coupon.discountValue}% off`
      : `$${(coupon.discountValue / 100).toFixed(2)} off`;
  const scopeLabel = coupon.appliesToAllProducts ? "All products" : "Selected products";
  return { discountLabel, scopeLabel };
}

export type PublicVendorPromoBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  couponCode: string | null;
};

export async function listPublicVendorOffers(vendorProfileIds: string[]) {
  if (vendorProfileIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(vendorProfileIds)];
  const now = new Date();

  const [vendors, coupons, banners] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { id: { in: uniqueIds }, status: "ACTIVE" },
      select: { id: true, storeName: true, storeSlug: true },
    }),
    prisma.vendorCoupon.findMany({
      where: { vendorProfileId: { in: uniqueIds }, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendorPromoBanner.findMany({
      where: {
        vendorProfileId: { in: uniqueIds },
        isActive: true,
      },
      include: { coupon: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return vendors.map((vendor) => {
    const vendorCoupons = coupons
      .filter((coupon) => coupon.vendorProfileId === vendor.id && isCouponCurrentlyValid(coupon))
      .map((coupon) => {
        const { discountLabel, scopeLabel } = formatCouponLabel(coupon);
        return {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderAmount: coupon.minOrderAmount,
          appliesToAllProducts: coupon.appliesToAllProducts,
          scopeLabel,
          label: discountLabel,
        };
      });

    const vendorBanners = banners
      .filter((banner) => {
        if (banner.vendorProfileId !== vendor.id) return false;
        if (banner.startsAt && banner.startsAt > now) return false;
        if (banner.expiresAt && banner.expiresAt < now) return false;
        return true;
      })
      .map((banner) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.imageUrl,
        couponCode:
          banner.coupon && isCouponCurrentlyValid(banner.coupon)
            ? banner.coupon.code
            : null,
      }));

    return {
      vendorProfileId: vendor.id,
      storeName: vendor.storeName,
      storeSlug: vendor.storeSlug,
      coupons: vendorCoupons,
      banners: vendorBanners,
    };
  });
}

export async function listPublicCouponsForProduct(productId: string, vendorProfileId: string) {
  const coupons = await prisma.vendorCoupon.findMany({
    where: { vendorProfileId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return coupons
    .filter(
      (coupon) =>
        isCouponCurrentlyValid(coupon) &&
        couponAppliesToProduct(
          {
            appliesToAllProducts: coupon.appliesToAllProducts ?? true,
            productIds: coupon.productIds ?? [],
          },
          productId
        )
    )
    .map((coupon) => {
      const { discountLabel, scopeLabel } = formatCouponLabel(coupon);
      return {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
        appliesToAllProducts: coupon.appliesToAllProducts,
        scopeLabel,
        label: discountLabel,
      };
    });
}

export async function listPublicStorefrontOffers(storeSlug: string) {
  const vendor = await prisma.vendorProfile.findFirst({
    where: { storeSlug, status: "ACTIVE" },
    select: { id: true },
  });

  if (!vendor) return null;

  const offers = await listPublicVendorOffers([vendor.id]);
  return offers[0] ?? null;
}
