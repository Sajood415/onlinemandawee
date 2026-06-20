import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { slugify } from "@/lib/utils/slug";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { CategoryRepository } from "@/repositories/category.repository";
import { ProductRepository } from "@/repositories/product.repository";

export class AdminProductService {
  constructor(
    private readonly productRepository = new ProductRepository(),
    private readonly categoryRepository = new CategoryRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  list(filters: {
    approvalStatus?: ProductApprovalStatus;
    search?: string;
    vendorProfileId?: string;
    isActive?: boolean;
  } = {}) {
    return this.productRepository.listForAdmin(filters);
  }

  async detail(productId: string) {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Product not found",
        statusCode: 404,
      });
    }

    return product;
  }

  async approve(productId: string, admin: AuthenticatedUser) {
    const product = await this.requirePendingProduct(productId);

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
      approvalStatus: "APPROVED",
      rejectionReason: null,
      isActive: true,
    });

    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.product_approved",
      entityType: "Product",
      entityId: updated.id,
    });

    return updated;
  }

  async reject(productId: string, admin: AuthenticatedUser, reason?: string) {
    const product = await this.requirePendingProduct(productId);

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
      approvalStatus: "REJECTED",
      rejectionReason: reason ?? "Product was rejected by admin review",
      isActive: product.isActive,
    });

    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.product_rejected",
      entityType: "Product",
      entityId: updated.id,
      metadata: {
        reason: reason ?? null,
      },
    });

    return updated;
  }

  async update(
    productId: string,
    admin: AuthenticatedUser,
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
      approvalStatus?: ProductApprovalStatus;
      rejectionReason?: string | null;
    }
  ) {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Product not found",
        statusCode: 404,
      });
    }

    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Category not found",
        statusCode: 400,
      });
    }

    const baseSlug = slugify(input.name);
    const existing = await this.productRepository.findByVendorAndSlug(
      product.vendorProfileId,
      baseSlug
    );
    const slug =
      !existing || existing.id === product.id
        ? baseSlug
        : `${baseSlug}-${product.id.slice(-6).toLowerCase()}`;

    const approvalStatus = input.approvalStatus ?? product.approvalStatus;
    const rejectionReason =
      input.rejectionReason !== undefined
        ? input.rejectionReason
        : approvalStatus === "REJECTED"
          ? product.rejectionReason
          : null;

    let isActive = input.isActive ?? product.isActive;
    if (input.isActive === undefined) {
      if (
        approvalStatus === "APPROVED" &&
        product.approvalStatus !== "APPROVED"
      ) {
        isActive = true;
      }
      if (approvalStatus === "ARCHIVED") isActive = false;
    }

    await this.productRepository.update({
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
      approvalStatus,
      rejectionReason,
      isActive,
    });

    const updated = await this.productRepository.findById(product.id);

    await this.auditLogRepository.create({
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "admin.product_updated",
      entityType: "Product",
      entityId: product.id,
    });

    return updated!;
  }

  private async requirePendingProduct(productId: string) {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Product not found",
        statusCode: 404,
      });
    }

    if (product.approvalStatus !== "PENDING_APPROVAL") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only pending products can be reviewed",
        statusCode: 400,
      });
    }

    return product;
  }
}
