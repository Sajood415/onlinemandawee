import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { slugify } from "@/lib/utils/slug";
import {
  mergeCategoryTranslationsWithImage,
  type CategoryTranslations,
} from "@/lib/localization/category-content";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { CategoryRepository } from "@/repositories/category.repository";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";

export class AdminCategoryService {
  constructor(
    private readonly categoryRepository = new CategoryRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async create(
    input: {
      name: string;
      translations?: CategoryTranslations;
      imageUrl?: string;
      parentId?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
    admin: AuthenticatedUser
  ) {
    const slug = await this.ensureUniqueSlug(input.name);

    if (input.parentId) {
      const parent = await this.categoryRepository.findById(input.parentId);

      if (!parent) {
        throw new AppError({
          code: ERROR_CODE.NOT_FOUND,
          message: "Parent category not found",
          statusCode: 404,
        });
      }
    }

    const category = await this.categoryRepository.create({
      name: input.name,
      slug,
      translations: mergeCategoryTranslationsWithImage({
        translations: input.translations,
        imageUrl: input.imageUrl,
      }),
      parentId: input.parentId,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    });

    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.category_created",
      entityType: "Category",
      entityId: category.id,
    });

    return category;
  }

  async update(
    categoryId: string,
    input: {
      name: string;
      translations?: CategoryTranslations;
      imageUrl?: string | null;
      parentId?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
    admin: AuthenticatedUser
  ) {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Category not found",
        statusCode: 404,
      });
    }

    if (input.parentId) {
      if (input.parentId === categoryId) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Category cannot be its own parent",
          statusCode: 400,
        });
      }

      const parent = await this.categoryRepository.findById(input.parentId);

      if (!parent) {
        throw new AppError({
          code: ERROR_CODE.NOT_FOUND,
          message: "Parent category not found",
          statusCode: 404,
        });
      }
    }

    const baseSlug = slugify(input.name);
    const existing = await this.categoryRepository.findBySlug(baseSlug);
    const slug =
      !existing || existing.id === categoryId
        ? baseSlug
        : `${baseSlug}-${categoryId.slice(-6).toLowerCase()}`;

    const updated = await this.categoryRepository.update({
      id: categoryId,
      name: input.name,
      slug,
      translations: mergeCategoryTranslationsWithImage({
        translations: input.translations,
        imageUrl: input.imageUrl,
        existing: category.translations,
      }),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      isActive: input.isActive,
      sortOrder: input.sortOrder,
    });

    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.category_updated",
      entityType: "Category",
      entityId: updated.id,
    });

    return updated;
  }

  list() {
    return this.categoryRepository.listAll();
  }

  async remove(categoryId: string, admin: AuthenticatedUser) {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Category not found",
        statusCode: 404,
      });
    }

    const [childCount, productCount] = await Promise.all([
      this.categoryRepository.countChildren(categoryId),
      this.categoryRepository.countProducts(categoryId),
    ]);

    if (childCount > 0) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message:
          "This category has sub-categories. Delete or move them before deleting this category.",
        statusCode: 409,
      });
    }

    if (productCount > 0) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: `${productCount} product${productCount === 1 ? "" : "s"} still use this category. Move or remove them before deleting it.`,
        statusCode: 409,
      });
    }

    await this.categoryRepository.delete(categoryId);

    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.category_deleted",
      entityType: "Category",
      entityId: categoryId,
    });

    return { id: categoryId };
  }

  private async ensureUniqueSlug(name: string) {
    const baseSlug = slugify(name);

    if (!baseSlug) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Invalid category name",
        statusCode: 400,
      });
    }

    const existing = await this.categoryRepository.findBySlug(baseSlug);

    if (existing) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "Category slug already exists",
        statusCode: 409,
      });
    }

    return baseSlug;
  }
}
