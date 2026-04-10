import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { slugify } from "@/lib/utils/slug";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";

export class VendorProductService {
  constructor(
    private readonly productRepository = new ProductRepository(),
    private readonly categoryRepository = new CategoryRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async create(
    auth: AuthenticatedUser,
    input: {
      categoryId: string;
      name: string;
      description: string;
      images: string[];
      sku?: string;
      currency: string;
      priceAmount: number;
      stockQty: number;
    }
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    const category = await this.requireActiveCategory(input.categoryId);
    const slug = await this.ensureUniqueProductSlug(vendor.id, input.name);

    const product = await this.productRepository.create({
      vendorProfileId: vendor.id,
      categoryId: category.id,
      name: input.name,
      slug,
      description: input.description,
      images: input.images,
      sku: input.sku,
      currency: input.currency,
      priceAmount: input.priceAmount,
      stockQty: input.stockQty,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.product_created",
      entityType: "Product",
      entityId: product.id,
    });

    return product;
  }

  async update(
    auth: AuthenticatedUser,
    productId: string,
    input: {
      categoryId: string;
      name: string;
      description: string;
      images: string[];
      sku?: string;
      currency: string;
      priceAmount: number;
      stockQty: number;
      isActive?: boolean;
    }
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    const product = await this.productRepository.findByVendorAndId(vendor.id, productId);

    if (!product) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Product not found",
        statusCode: 404,
      });
    }

    if (product.approvalStatus === "ARCHIVED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Archived product cannot be updated",
        statusCode: 400,
      });
    }

    const category = await this.requireActiveCategory(input.categoryId);
    const baseSlug = slugify(input.name);
    const existing = await this.productRepository.findByVendorAndSlug(vendor.id, baseSlug);
    const slug =
      !existing || existing.id === product.id
        ? baseSlug
        : `${baseSlug}-${product.id.slice(-6).toLowerCase()}`;

    const updated = await this.productRepository.update({
      id: product.id,
      categoryId: category.id,
      name: input.name,
      slug,
      description: input.description,
      images: input.images,
      sku: input.sku,
      currency: input.currency,
      priceAmount: input.priceAmount,
      stockQty: input.stockQty,
      isActive: input.isActive ?? product.isActive,
      approvalStatus:
        product.approvalStatus === "APPROVED" ? "DRAFT" : product.approvalStatus,
      rejectionReason: null,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.product_updated",
      entityType: "Product",
      entityId: updated.id,
    });

    return updated;
  }

  async list(auth: AuthenticatedUser) {
    const vendor = await this.requireActiveVendor(auth.id);
    return this.productRepository.listByVendor(vendor.id);
  }

  async submitForApproval(auth: AuthenticatedUser, productId: string) {
    const vendor = await this.requireActiveVendor(auth.id);
    const product = await this.productRepository.findByVendorAndId(vendor.id, productId);

    if (!product) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Product not found",
        statusCode: 404,
      });
    }

    if (!product.isActive) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Inactive product cannot be submitted",
        statusCode: 400,
      });
    }

    const updated = await this.productRepository.update({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      images: product.images,
      sku: product.sku ?? undefined,
      currency: product.currency,
      priceAmount: product.priceAmount,
      stockQty: product.stockQty,
      approvalStatus: "PENDING_APPROVAL",
      rejectionReason: null,
      isActive: product.isActive,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.product_submitted",
      entityType: "Product",
      entityId: updated.id,
    });

    return updated;
  }

  async archive(auth: AuthenticatedUser, productId: string) {
    const vendor = await this.requireActiveVendor(auth.id);
    const product = await this.productRepository.findByVendorAndId(vendor.id, productId);

    if (!product) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Product not found",
        statusCode: 404,
      });
    }

    const archived = await this.productRepository.archive(product.id);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.product_archived",
      entityType: "Product",
      entityId: archived.id,
    });

    return archived;
  }

  private async requireActiveVendor(userId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    if (vendor.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active vendors can manage catalog",
        statusCode: 403,
      });
    }

    return vendor;
  }

  private async requireActiveCategory(categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category || !category.isActive) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Category not found",
        statusCode: 404,
      });
    }

    return category;
  }

  private async ensureUniqueProductSlug(vendorProfileId: string, name: string) {
    const baseSlug = slugify(name);

    if (!baseSlug) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Invalid product name",
        statusCode: 400,
      });
    }

    const existing = await this.productRepository.findByVendorAndSlug(
      vendorProfileId,
      baseSlug
    );

    if (existing) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "Product slug already exists for this vendor",
        statusCode: 409,
      });
    }

    return baseSlug;
  }
}
