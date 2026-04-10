import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import { prisma } from "@/lib/db/prisma";

export class ProductRepository {
  create(input: {
    vendorProfileId: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    images: string[];
    sku?: string;
    currency: string;
    priceAmount: number;
    stockQty: number;
  }) {
    return prisma.product.create({
      data: {
        vendorProfileId: input.vendorProfileId,
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        images: input.images,
        sku: input.sku ?? null,
        currency: input.currency,
        priceAmount: input.priceAmount,
        stockQty: input.stockQty,
      },
      include: {
        category: true,
      },
    });
  }

  update(input: {
    id: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    images: string[];
    sku?: string;
    currency: string;
    priceAmount: number;
    stockQty: number;
    approvalStatus?: ProductApprovalStatus;
    rejectionReason?: string | null;
    isActive?: boolean;
  }) {
    return prisma.product.update({
      where: { id: input.id },
      data: {
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        images: input.images,
        sku: input.sku ?? null,
        currency: input.currency,
        priceAmount: input.priceAmount,
        stockQty: input.stockQty,
        approvalStatus: input.approvalStatus,
        rejectionReason: input.rejectionReason,
        isActive: input.isActive,
      },
      include: {
        category: true,
      },
    });
  }

  findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  findByVendorAndSlug(vendorProfileId: string, slug: string) {
    return prisma.product.findUnique({
      where: {
        vendorProfileId_slug: {
          vendorProfileId,
          slug,
        },
      },
    });
  }

  findByVendorAndId(vendorProfileId: string, id: string) {
    return prisma.product.findFirst({
      where: {
        id,
        vendorProfileId,
      },
      include: {
        category: true,
      },
    });
  }

  listByVendor(vendorProfileId: string) {
    return prisma.product.findMany({
      where: {
        vendorProfileId,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  listPendingApproval() {
    return prisma.product.findMany({
      where: {
        approvalStatus: "PENDING_APPROVAL",
      },
      include: {
        category: true,
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  listByApprovalStatus(approvalStatus?: ProductApprovalStatus) {
    return prisma.product.findMany({
      where: approvalStatus
        ? {
            approvalStatus,
          }
        : undefined,
      include: {
        category: true,
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  archive(id: string) {
    return prisma.product.update({
      where: { id },
      data: {
        approvalStatus: "ARCHIVED",
        isActive: false,
      },
      include: {
        category: true,
      },
    });
  }

  listPublic(filters: {
    categorySlug?: string;
    vendorStoreSlug?: string;
    search?: string;
  }) {
    return prisma.product.findMany({
      where: {
        approvalStatus: "APPROVED",
        isActive: true,
        ...(filters.search
          ? {
              OR: [
                {
                  name: {
                    contains: filters.search,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: filters.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        ...(filters.categorySlug
          ? {
              category: {
                slug: filters.categorySlug,
              },
            }
          : {}),
        ...(filters.vendorStoreSlug
          ? {
              vendorProfile: {
                storeSlug: filters.vendorStoreSlug,
                status: "ACTIVE",
              },
            }
          : {
              vendorProfile: {
                status: "ACTIVE",
              },
            }),
      },
      include: {
        category: true,
        vendorProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
