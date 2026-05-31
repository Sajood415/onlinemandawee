import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { prisma } from "@/lib/db/prisma";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { VendorCouponRepository } from "@/repositories/vendor-coupon.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

export class VendorCouponService {
  constructor(
    private readonly vendorCouponRepository = new VendorCouponRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async list(auth: AuthenticatedUser) {
    const vendor = await this.requireActiveVendor(auth.id);
    const coupons = await this.vendorCouponRepository.listByVendorProfileId(vendor.id);

    const productIds = [
      ...new Set(coupons.flatMap((coupon) => coupon.productIds ?? [])),
    ];
    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds }, vendorProfileId: vendor.id },
            select: { id: true, name: true },
          })
        : [];
    const productNameById = new Map(products.map((product) => [product.id, product.name]));

    return coupons.map((coupon) => {
      const scopedProductIds = coupon.productIds ?? [];
      return this.serialize(coupon, {
        productNames: scopedProductIds
          .map((id) => productNameById.get(id))
          .filter((name): name is string => Boolean(name)),
      });
    });
  }

  async create(
    auth: AuthenticatedUser,
    input: {
      code: string;
      discountType: "PERCENTAGE" | "FIXED_AMOUNT";
      discountValue: number;
      isActive?: boolean;
      appliesToAllProducts?: boolean;
      productIds?: string[];
      startsAt?: string | null;
      expiresAt?: string | null;
      maxUses?: number | null;
      minOrderAmount?: number | null;
    }
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    const code = normalizeCouponCode(input.code);
    const appliesToAllProducts = input.appliesToAllProducts ?? true;
    const productIds = appliesToAllProducts ? [] : (input.productIds ?? []);

    await this.assertProductScope(vendor.id, appliesToAllProducts, productIds);

    const existing = await this.vendorCouponRepository.findByVendorAndCode(vendor.id, code);
    if (existing) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "You already have a coupon with this code",
        statusCode: 409,
      });
    }

    const coupon = await this.vendorCouponRepository.create({
      vendorProfileId: vendor.id,
      code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      isActive: input.isActive ?? true,
      appliesToAllProducts,
      productIds,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      maxUses: input.maxUses ?? null,
      minOrderAmount: input.minOrderAmount ?? null,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.coupon_created",
      entityType: "VendorCoupon",
      entityId: coupon.id,
    });

    return this.serialize(coupon);
  }

  async update(
    auth: AuthenticatedUser,
    couponId: string,
    input: {
      code?: string;
      discountType?: "PERCENTAGE" | "FIXED_AMOUNT";
      discountValue?: number;
      isActive?: boolean;
      appliesToAllProducts?: boolean;
      productIds?: string[];
      startsAt?: string | null;
      expiresAt?: string | null;
      maxUses?: number | null;
      minOrderAmount?: number | null;
    }
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    const coupon = await this.vendorCouponRepository.findByVendorAndId(vendor.id, couponId);

    if (!coupon) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Coupon not found",
        statusCode: 404,
      });
    }

    const nextCode = input.code ? normalizeCouponCode(input.code) : undefined;
    if (nextCode && nextCode !== coupon.code) {
      const existing = await this.vendorCouponRepository.findByVendorAndCode(vendor.id, nextCode);
      if (existing && existing.id !== coupon.id) {
        throw new AppError({
          code: ERROR_CODE.CONFLICT,
          message: "You already have a coupon with this code",
          statusCode: 409,
        });
      }
    }

    const appliesToAllProducts =
      input.appliesToAllProducts ?? coupon.appliesToAllProducts;
    const productIds =
      input.appliesToAllProducts === true
        ? []
        : input.productIds ?? (appliesToAllProducts ? [] : (coupon.productIds ?? []));

    if (input.appliesToAllProducts !== undefined || input.productIds !== undefined) {
      await this.assertProductScope(vendor.id, appliesToAllProducts, productIds);
    }

    const updated = await this.vendorCouponRepository.update(coupon.id, {
      ...(nextCode ? { code: nextCode } : {}),
      ...(input.discountType ? { discountType: input.discountType } : {}),
      ...(input.discountValue != null ? { discountValue: input.discountValue } : {}),
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
      ...(input.appliesToAllProducts !== undefined
        ? { appliesToAllProducts, productIds }
        : input.productIds !== undefined
          ? { productIds }
          : {}),
      ...(input.startsAt !== undefined
        ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
        : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {}),
      ...(input.maxUses !== undefined ? { maxUses: input.maxUses } : {}),
      ...(input.minOrderAmount !== undefined ? { minOrderAmount: input.minOrderAmount } : {}),
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.coupon_updated",
      entityType: "VendorCoupon",
      entityId: updated.id,
    });

    const updatedProductIds = updated.productIds ?? [];
    const productNames =
      !updated.appliesToAllProducts && updatedProductIds.length > 0
        ? (
            await prisma.product.findMany({
              where: { id: { in: updatedProductIds }, vendorProfileId: vendor.id },
              select: { name: true },
            })
          ).map((product) => product.name)
        : [];

    return this.serialize(updated, { productNames });
  }

  private async assertProductScope(
    vendorProfileId: string,
    appliesToAllProducts: boolean,
    productIds: string[]
  ) {
    if (appliesToAllProducts) return;

    if (productIds.length === 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Select at least one product, or choose all products",
        statusCode: 400,
      });
    }

    const owned = await prisma.product.count({
      where: {
        id: { in: productIds },
        vendorProfileId,
      },
    });

    if (owned !== productIds.length) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "One or more selected products are invalid",
        statusCode: 400,
      });
    }
  }

  private serialize(
    coupon: {
      id: string;
      code: string;
      discountType: "PERCENTAGE" | "FIXED_AMOUNT";
      discountValue: number;
      isActive: boolean;
      appliesToAllProducts?: boolean;
      productIds?: string[];
      startsAt: Date | null;
      expiresAt: Date | null;
      maxUses: number | null;
      usedCount: number;
      minOrderAmount: number | null;
      createdAt: Date;
      updatedAt: Date;
    },
    extras?: { productNames?: string[] }
  ) {
    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      isActive: coupon.isActive,
      appliesToAllProducts: coupon.appliesToAllProducts ?? true,
      productIds: coupon.productIds ?? [],
      productNames: extras?.productNames ?? [],
      startsAt: coupon.startsAt?.toISOString() ?? null,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      minOrderAmount: coupon.minOrderAmount,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
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
