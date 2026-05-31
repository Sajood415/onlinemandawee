import type { CouponDiscountType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export class VendorCouponRepository {
  listByVendorProfileId(vendorProfileId: string) {
    return prisma.vendorCoupon.findMany({
      where: { vendorProfileId },
      orderBy: { createdAt: "desc" },
    });
  }

  findByVendorAndId(vendorProfileId: string, id: string) {
    return prisma.vendorCoupon.findFirst({
      where: { id, vendorProfileId },
    });
  }

  findByVendorAndCode(vendorProfileId: string, code: string) {
    return prisma.vendorCoupon.findFirst({
      where: { vendorProfileId, code },
    });
  }

  create(input: {
    vendorProfileId: string;
    code: string;
    discountType: CouponDiscountType;
    discountValue: number;
    isActive?: boolean;
    appliesToAllProducts?: boolean;
    productIds?: string[];
    startsAt?: Date | null;
    expiresAt?: Date | null;
    maxUses?: number | null;
    minOrderAmount?: number | null;
  }) {
    return prisma.vendorCoupon.create({ data: input });
  }

  update(
    id: string,
    input: {
      code?: string;
      discountType?: CouponDiscountType;
      discountValue?: number;
      isActive?: boolean;
      appliesToAllProducts?: boolean;
      productIds?: string[];
      startsAt?: Date | null;
      expiresAt?: Date | null;
      maxUses?: number | null;
      minOrderAmount?: number | null;
    }
  ) {
    return prisma.vendorCoupon.update({
      where: { id },
      data: input,
    });
  }
}
