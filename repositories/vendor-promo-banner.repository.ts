import { prisma } from "@/lib/db/prisma";

export class VendorPromoBannerRepository {
  listByVendorProfileId(vendorProfileId: string) {
    return prisma.vendorPromoBanner.findMany({
      where: { vendorProfileId },
      include: { coupon: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  findByVendorAndId(vendorProfileId: string, id: string) {
    return prisma.vendorPromoBanner.findFirst({
      where: { id, vendorProfileId },
      include: { coupon: true },
    });
  }

  create(input: {
    vendorProfileId: string;
    title: string;
    subtitle?: string | null;
    imageUrl: string;
    couponId?: string | null;
    isActive?: boolean;
    sortOrder?: number;
    startsAt?: Date | null;
    expiresAt?: Date | null;
  }) {
    return prisma.vendorPromoBanner.create({
      data: input,
      include: { coupon: true },
    });
  }

  update(
    id: string,
    input: {
      title?: string;
      subtitle?: string | null;
      imageUrl?: string;
      couponId?: string | null;
      isActive?: boolean;
      sortOrder?: number;
      startsAt?: Date | null;
      expiresAt?: Date | null;
    }
  ) {
    return prisma.vendorPromoBanner.update({
      where: { id },
      data: input,
      include: { coupon: true },
    });
  }

  delete(id: string) {
    return prisma.vendorPromoBanner.delete({ where: { id } });
  }
}
