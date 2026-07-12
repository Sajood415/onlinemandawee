import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { ProductRepository } from "@/repositories/product.repository";
import {
  ProductReviewRepository,
  type ProductReviewRecord,
} from "@/repositories/product-review.repository";
import type { CreateProductReviewInput } from "@/validators/product-review.validator";

function reviewerDisplayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

function serializePublicReview(review: {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  user: { fullName: string };
}) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    reviewerName: reviewerDisplayName(review.user.fullName),
  };
}

function serializeAdminReview(review: ProductReviewRecord) {
  return {
    id: review.id,
    productId: review.productId,
    rating: review.rating,
    comment: review.comment,
    isHidden: review.isHidden,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    reviewerName: review.user.fullName,
    reviewerEmail: review.user.email,
    product: review.product,
  };
}

export class ProductReviewService {
  constructor(
    private readonly productReviewRepository = new ProductReviewRepository(),
    private readonly productRepository = new ProductRepository()
  ) {}

  private async recomputeAggregate(productId: string) {
    const aggregate = await this.productReviewRepository.aggregateForProduct(productId);
    await this.productRepository.updateRatingAggregate(productId, {
      ratingAverage: Math.round(aggregate.average * 10) / 10,
      reviewCount: aggregate.count,
    });
  }

  async createForUser(
    auth: AuthenticatedUser,
    productId: string,
    input: CreateProductReviewInput
  ) {
    if (auth.role !== "CUSTOMER") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only customers can submit reviews",
        statusCode: 403,
      });
    }

    const product = await this.productRepository.findById(productId);

    if (!product || product.approvalStatus !== "APPROVED" || !product.isActive) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Product not found",
        statusCode: 404,
      });
    }

    const hasEligiblePurchase = await this.productReviewRepository.hasDeliveredPaidPurchaseForUser(
      {
        productId,
        userId: auth.id,
      }
    );
    if (!hasEligiblePurchase) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message:
          "You can only review products that you purchased in a paid order and received.",
        statusCode: 400,
      });
    }

    let review;
    try {
      review = await this.productReviewRepository.create({
        productId,
        userId: auth.id,
        rating: input.rating,
        comment: input.comment,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError({
          code: ERROR_CODE.CONFLICT,
          message: "You have already reviewed this product.",
          statusCode: 409,
        });
      }
      throw error;
    }

    await this.recomputeAggregate(productId);

    return serializePublicReview(review);
  }

  async listPublicForProduct(productId: string, pagination: { page: number; pageSize: number }) {
    const { rows, total } = await this.productReviewRepository.listPublicByProduct(
      productId,
      pagination
    );

    return {
      reviews: rows.map(serializePublicReview),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    };
  }

  async listForAdmin(filters: {
    search?: string;
    rating?: number;
    isHidden?: boolean;
    page: number;
    pageSize: number;
  }) {
    const { rows, total } = await this.productReviewRepository.listForAdmin(filters);

    return {
      reviews: rows.map(serializeAdminReview),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    };
  }

  async setVisibilityForAdmin(id: string, isHidden: boolean) {
    const existing = await this.productReviewRepository.findById(id);
    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Review not found",
        statusCode: 404,
      });
    }

    const updated = await this.productReviewRepository.setHidden(id, isHidden);
    await this.recomputeAggregate(existing.productId);

    return serializeAdminReview(updated);
  }

  async deleteForAdmin(id: string) {
    const existing = await this.productReviewRepository.findById(id);
    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Review not found",
        statusCode: 404,
      });
    }

    await this.productReviewRepository.delete(id);
    await this.recomputeAggregate(existing.productId);

    return { deleted: true };
  }
}
