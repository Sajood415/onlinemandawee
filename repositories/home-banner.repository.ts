import type { HomeBannerPlacement } from "@/domain/home/home-banner-placement";
import { prisma } from "@/lib/db/prisma";

export class HomeBannerRepository {
  listAll() {
    return prisma.homeBanner.findMany({
      orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  listActive(now = new Date()) {
    return prisma.homeBanner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        ],
      },
      orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  findById(id: string) {
    return prisma.homeBanner.findUnique({ where: { id } });
  }

  create(input: {
    title: string;
    subtitle?: string | null;
    placement: HomeBannerPlacement;
    imageUrl: string;
    imageMobileUrl?: string | null;
    href: string;
    ctaLabel?: string | null;
    isActive?: boolean;
    sortOrder?: number;
    startsAt?: Date | null;
    expiresAt?: Date | null;
  }) {
    return prisma.homeBanner.create({
      data: {
        title: input.title,
        subtitle: input.subtitle ?? null,
        placement: input.placement,
        imageUrl: input.imageUrl,
        imageMobileUrl: input.imageMobileUrl ?? null,
        href: input.href,
        ctaLabel: input.ctaLabel ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        startsAt: input.startsAt ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    });
  }

  update(
    id: string,
    input: Partial<{
      title: string;
      subtitle: string | null;
      placement: HomeBannerPlacement;
      imageUrl: string;
      imageMobileUrl: string | null;
      href: string;
      ctaLabel: string | null;
      isActive: boolean;
      sortOrder: number;
      startsAt: Date | null;
      expiresAt: Date | null;
    }>
  ) {
    return prisma.homeBanner.update({
      where: { id },
      data: input,
    });
  }

  delete(id: string) {
    return prisma.homeBanner.delete({ where: { id } });
  }
}
