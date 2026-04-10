import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { ProductRepository } from "@/repositories/product.repository";

export class AdminProductService {
  constructor(
    private readonly productRepository = new ProductRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  list(approvalStatus?: ProductApprovalStatus) {
    return this.productRepository.listByApprovalStatus(approvalStatus);
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
