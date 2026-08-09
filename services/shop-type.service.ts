import "server-only";

import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { DEFAULT_SHOP_TYPES } from "@/lib/shop-types/defaults";
import {
  normalizeShopTypeSlug,
  resolveShopTypeLabel,
} from "@/lib/shop-types/labels";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { ShopTypeRepository } from "@/repositories/shop-type.repository";

type ShopTypeRow = Awaited<ReturnType<ShopTypeRepository["listAll"]>>[number];

/** Process-local lock so concurrent first hits don't double-seed. */
let ensureDefaultsInFlight: Promise<void> | null = null;

export class ShopTypeService {
  constructor(
    private readonly repository = new ShopTypeRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async listForAdmin() {
    await this.ensureDefaults();
    const rows = await this.repository.listAll();
    return rows.map((row) => this.toAdminDto(row));
  }

  async listActivePublic(locale: SupportedLocale | string = "en") {
    await this.ensureDefaults();
    const rows = await this.repository.listActive();
    return rows.map((row) => ({
      slug: row.slug,
      label: resolveShopTypeLabel(row.name, row.translations, locale),
      sortOrder: row.sortOrder,
    }));
  }

  /**
   * Validates a shop type for assignment.
   * Inactive types are rejected unless `allowSlug` matches (vendor already has it).
   */
  async assertAssignableSlug(
    slug: string | null | undefined,
    options?: { allowSlug?: string | null }
  ) {
    if (!slug) return;
    const normalized = normalizeShopTypeSlug(slug);
    if (!normalized) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Invalid shop type",
        statusCode: 400,
      });
    }
    await this.ensureDefaults();
    const row = await this.repository.findBySlug(normalized);
    if (!row) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Invalid shop type",
        statusCode: 400,
      });
    }
    const allow =
      options?.allowSlug != null
        ? normalizeShopTypeSlug(options.allowSlug)
        : null;
    if (!row.isActive && allow !== normalized) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "That shop type is no longer available",
        statusCode: 400,
      });
    }
  }

  async resolveLabelMap(locale: SupportedLocale | string = "en") {
    await this.ensureDefaults();
    const rows = await this.repository.listAll();
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.slug, resolveShopTypeLabel(row.name, row.translations, locale));
    }
    return map;
  }

  async create(
    auth: AuthenticatedUser,
    input: {
      name: string;
      slug?: string;
      translations?: {
        ps?: { name?: string };
        "fa-AF"?: { name?: string };
      } | null;
      isActive?: boolean;
      sortOrder?: number;
    }
  ) {
    await this.ensureDefaults();
    const name = input.name.trim();
    const slug = normalizeShopTypeSlug(input.slug?.trim() || name);
    if (slug.length < 2) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Shop type slug is invalid",
        statusCode: 400,
      });
    }

    const existing = await this.repository.findBySlug(slug);
    if (existing) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "A shop type with that slug already exists",
        statusCode: 409,
      });
    }

    const created = await this.repository.create({
      slug,
      name,
      translations: input.translations ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.shop_type_created",
      entityType: "ShopType",
      entityId: created.id,
    });

    return this.toAdminDto(created);
  }

  async update(
    auth: AuthenticatedUser,
    id: string,
    input: {
      name?: string;
      translations?: {
        ps?: { name?: string };
        "fa-AF"?: { name?: string };
      } | null;
      isActive?: boolean;
      sortOrder?: number;
    }
  ) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Shop type not found",
        statusCode: 404,
      });
    }

    // Deactivate is always allowed — vendors keep the slug; type is hidden from new picks.
    const updated = await this.repository.update(id, {
      name: input.name?.trim(),
      translations: input.translations,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.shop_type_updated",
      entityType: "ShopType",
      entityId: id,
    });

    return this.toAdminDto(updated);
  }

  async delete(auth: AuthenticatedUser, id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Shop type not found",
        statusCode: 404,
      });
    }

    const inUse = await this.repository.countVendorsUsingSlug(existing.slug);
    if (inUse > 0) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: `Cannot delete: ${inUse} vendor(s) still use this shop type. Deactivate it instead.`,
        statusCode: 409,
      });
    }

    await this.repository.deleteById(id);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.shop_type_deleted",
      entityType: "ShopType",
      entityId: id,
    });

    return { deleted: true };
  }

  private toAdminDto(row: ShopTypeRow) {
    const translations = (row.translations ?? {}) as {
      ps?: { name?: string };
      "fa-AF"?: { name?: string };
    };
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      namePs: translations.ps?.name ?? "",
      nameFa: translations["fa-AF"]?.name ?? "",
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async ensureDefaults() {
    if (!ensureDefaultsInFlight) {
      ensureDefaultsInFlight = this.seedDefaultsIfEmpty().finally(() => {
        ensureDefaultsInFlight = null;
      });
    }
    await ensureDefaultsInFlight;
  }

  private async seedDefaultsIfEmpty() {
    const count = await this.repository.count();
    if (count > 0) return;

    for (const item of DEFAULT_SHOP_TYPES) {
      const existing = await this.repository.findBySlug(item.slug);
      if (existing) continue;
      try {
        await this.repository.create({
          slug: item.slug,
          name: item.name,
          translations: item.translations,
          isActive: true,
          sortOrder: item.sortOrder,
        });
      } catch (error) {
        // Concurrent first request may create the same slug — safe to continue.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }
  }
}
