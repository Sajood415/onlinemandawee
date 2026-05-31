import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { VendorCouponRepository } from "@/repositories/vendor-coupon.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { VendorPromoBannerRepository } from "@/repositories/vendor-promo-banner.repository";

export class VendorPromoBannerService {
  constructor(
    private readonly vendorPromoBannerRepository = new VendorPromoBannerRepository(),
    private readonly vendorCouponRepository = new VendorCouponRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async list(auth: AuthenticatedUser) {
    const vendor = await this.requireActiveVendor(auth.id);
    const banners = await this.vendorPromoBannerRepository.listByVendorProfileId(vendor.id);
    return banners.map((banner) => this.serialize(banner));
  }

  async create(
    auth: AuthenticatedUser,
    input: {
      title: string;
      subtitle?: string | null;
      imageUrl: string;
      couponId?: string | null;
      isActive?: boolean;
      sortOrder?: number;
      startsAt?: string | null;
      expiresAt?: string | null;
    }
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    await this.validateCouponLink(vendor.id, input.couponId);

    const banner = await this.vendorPromoBannerRepository.create({
      vendorProfileId: vendor.id,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      imageUrl: input.imageUrl,
      couponId: input.couponId ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.promo_banner_created",
      entityType: "VendorPromoBanner",
      entityId: banner.id,
    });

    return this.serialize(banner);
  }

  async update(
    auth: AuthenticatedUser,
    bannerId: string,
    input: {
      title?: string;
      subtitle?: string | null;
      imageUrl?: string;
      couponId?: string | null;
      isActive?: boolean;
      sortOrder?: number;
      startsAt?: string | null;
      expiresAt?: string | null;
    }
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    const banner = await this.vendorPromoBannerRepository.findByVendorAndId(vendor.id, bannerId);

    if (!banner) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Promotional banner not found",
        statusCode: 404,
      });
    }

    if (input.couponId !== undefined) {
      await this.validateCouponLink(vendor.id, input.couponId);
    }

    const updated = await this.vendorPromoBannerRepository.update(banner.id, {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle?.trim() || null } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.couponId !== undefined ? { couponId: input.couponId } : {}),
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
      ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
      ...(input.startsAt !== undefined
        ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
        : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {}),
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.promo_banner_updated",
      entityType: "VendorPromoBanner",
      entityId: updated.id,
    });

    return this.serialize(updated);
  }

  async delete(auth: AuthenticatedUser, bannerId: string) {
    const vendor = await this.requireActiveVendor(auth.id);
    const banner = await this.vendorPromoBannerRepository.findByVendorAndId(vendor.id, bannerId);

    if (!banner) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Promotional banner not found",
        statusCode: 404,
      });
    }

    await this.vendorPromoBannerRepository.delete(banner.id);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.promo_banner_deleted",
      entityType: "VendorPromoBanner",
      entityId: banner.id,
    });
  }

  private async validateCouponLink(vendorProfileId: string, couponId?: string | null) {
    if (!couponId) return;

    const coupon = await this.vendorCouponRepository.findByVendorAndId(vendorProfileId, couponId);
    if (!coupon) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Selected coupon does not belong to your store",
        statusCode: 400,
      });
    }
  }

  private serialize(banner: {
    id: string;
    title: string;
    subtitle: string | null;
    imageUrl: string;
    couponId: string | null;
    isActive: boolean;
    sortOrder: number;
    startsAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    coupon: { code: string } | null;
  }) {
    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      couponId: banner.couponId,
      couponCode: banner.coupon?.code ?? null,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
      startsAt: banner.startsAt?.toISOString() ?? null,
      expiresAt: banner.expiresAt?.toISOString() ?? null,
      createdAt: banner.createdAt.toISOString(),
      updatedAt: banner.updatedAt.toISOString(),
    };
  }

  private async requireActiveVendor(userId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);

    if (!vendor || vendor.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Active vendor profile required",
        statusCode: 403,
      });
    }

    return vendor;
  }
}
