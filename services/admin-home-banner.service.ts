import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { HomeBannerPlacement } from "@/domain/home/home-banner-placement";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  toPublicBannerPlacement,
  toPublicBannerSortOrder,
  toStoredBannerPlacement,
} from "@/lib/home/banner-placement";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { HomeBannerRepository } from "@/repositories/home-banner.repository";

type BannerInput = {
  title: string;
  subtitle?: string | null;
  placement?: HomeBannerPlacement;
  imageUrl: string;
  imageMobileUrl?: string | null;
  href: string;
  ctaLabel?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
};

export class AdminHomeBannerService {
  constructor(
    private readonly homeBannerRepository = new HomeBannerRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  list() {
    return this.homeBannerRepository.listAll().then((banners) => banners.map(this.serialize));
  }

  listActive() {
    return this.homeBannerRepository
      .listActive()
      .then((banners) => banners.map(this.serialize));
  }

  async create(admin: AuthenticatedUser, input: BannerInput) {
    const stored = toStoredBannerPlacement({
      placement: input.placement,
      sortOrder: input.sortOrder,
    });

    const banner = await this.homeBannerRepository.create({
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      placement: stored.placement,
      imageUrl: input.imageUrl,
      imageMobileUrl: input.imageMobileUrl ?? null,
      href: input.href.trim(),
      ctaLabel: input.ctaLabel?.trim() || null,
      isActive: input.isActive ?? true,
      sortOrder: stored.sortOrder,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });

    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.home_banner_created",
      entityType: "HomeBanner",
      entityId: banner.id,
    });

    return this.serialize(banner);
  }

  async update(admin: AuthenticatedUser, bannerId: string, input: Partial<BannerInput>) {
    const banner = await this.homeBannerRepository.findById(bannerId);

    if (!banner) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Home banner not found",
        statusCode: 404,
      });
    }

    const stored =
      input.placement !== undefined || input.sortOrder !== undefined
        ? toStoredBannerPlacement({
            placement: input.placement ?? toPublicBannerPlacement(banner),
            sortOrder:
              input.sortOrder ??
              toPublicBannerSortOrder({
                placement: banner.placement,
                sortOrder: banner.sortOrder,
              }),
          })
        : null;

    const updated = await this.homeBannerRepository.update(bannerId, {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle?.trim() || null } : {}),
      ...(stored ? { placement: stored.placement, sortOrder: stored.sortOrder } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.imageMobileUrl !== undefined
        ? { imageMobileUrl: input.imageMobileUrl }
        : {}),
      ...(input.href !== undefined ? { href: input.href.trim() } : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.startsAt !== undefined
        ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
        : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {}),
    });

    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.home_banner_updated",
      entityType: "HomeBanner",
      entityId: updated.id,
    });

    return this.serialize(updated);
  }

  async delete(admin: AuthenticatedUser, bannerId: string) {
    const banner = await this.homeBannerRepository.findById(bannerId);

    if (!banner) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Home banner not found",
        statusCode: 404,
      });
    }

    await this.homeBannerRepository.delete(bannerId);

    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.home_banner_deleted",
      entityType: "HomeBanner",
      entityId: bannerId,
    });
  }

  private serialize(banner: {
    id: string;
    title: string;
    subtitle: string | null;
    placement: string;
    imageUrl: string;
    imageMobileUrl: string | null;
    href: string;
    ctaLabel: string | null;
    isActive: boolean;
    sortOrder: number;
    startsAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      placement: toPublicBannerPlacement(banner),
      imageUrl: banner.imageUrl,
      imageMobileUrl: banner.imageMobileUrl,
      href: banner.href,
      ctaLabel: banner.ctaLabel,
      isActive: banner.isActive,
      sortOrder: toPublicBannerSortOrder(banner),
      startsAt: banner.startsAt?.toISOString() ?? null,
      expiresAt: banner.expiresAt?.toISOString() ?? null,
      createdAt: banner.createdAt.toISOString(),
      updatedAt: banner.updatedAt.toISOString(),
    };
  }
}
