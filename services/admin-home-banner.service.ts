import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { HomeBannerPlacement } from "@/domain/home/home-banner-placement";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
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
    const banner = await this.homeBannerRepository.create({
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      placement: input.placement ?? "HERO",
      imageUrl: input.imageUrl,
      imageMobileUrl: input.imageMobileUrl ?? null,
      href: input.href.trim(),
      ctaLabel: input.ctaLabel?.trim() || null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
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

    const updated = await this.homeBannerRepository.update(bannerId, {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle?.trim() || null } : {}),
      ...(input.placement !== undefined ? { placement: input.placement } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.imageMobileUrl !== undefined
        ? { imageMobileUrl: input.imageMobileUrl }
        : {}),
      ...(input.href !== undefined ? { href: input.href.trim() } : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
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
    placement: HomeBannerPlacement;
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
      placement: banner.placement,
      imageUrl: banner.imageUrl,
      imageMobileUrl: banner.imageMobileUrl,
      href: banner.href,
      ctaLabel: banner.ctaLabel,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
      startsAt: banner.startsAt?.toISOString() ?? null,
      expiresAt: banner.expiresAt?.toISOString() ?? null,
      createdAt: banner.createdAt.toISOString(),
      updatedAt: banner.updatedAt.toISOString(),
    };
  }
}
