import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import { prisma } from "@/lib/db/prisma";
import type { ProductTranslations } from "@/lib/localization/product-content";
import { Prisma } from "@prisma/client";

export class ProductRepository {
  create(input: {
    vendorProfileId: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    translations?: ProductTranslations;
    images: string[];
    sku?: string;
    currency: string;
    priceAmount: number;
    stockQty: number;
    approvalStatus?: ProductApprovalStatus;
  }) {
    return prisma.product.create({
      data: {
        vendorProfileId: input.vendorProfileId,
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        ...(input.translations
          ? { translations: input.translations as Prisma.InputJsonValue }
          : {}),
        images: input.images,
        sku: input.sku ?? null,
        currency: input.currency,
        priceAmount: input.priceAmount,
        stockQty: input.stockQty,
        ...(input.approvalStatus ? { approvalStatus: input.approvalStatus } : {}),
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
    translations?: ProductTranslations | null;
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
        name: input.name,
        slug: input.slug,
        description: input.description,
        ...(input.translations !== undefined
          ? { translations: (input.translations ?? null) as Prisma.InputJsonValue }
          : {}),
        images: input.images,
        sku: input.sku ?? null,
        currency: input.currency,
        priceAmount: input.priceAmount,
        stockQty: input.stockQty,
        approvalStatus: input.approvalStatus,
        rejectionReason: input.rejectionReason,
        isActive: input.isActive,
        category: {
          connect: { id: input.categoryId },
        },
      },
      include: {
        category: true,
      },
    });
  }

  private publicProductInclude = {
    category: true,
    variants: {
      where: { isActive: true },
      orderBy: { createdAt: "asc" as const },
    },
    vendorProfile: {
      include: {
        user: true,
      },
    },
  } as const;

  findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: this.publicProductInclude,
    });
  }

  findBySlug(slug: string) {
    return prisma.product.findFirst({
      where: { slug },
      include: this.publicProductInclude,
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
        variants: {
          orderBy: { createdAt: "asc" as const },
        },
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
    return this.listForAdmin({ approvalStatus });
  }

  listForAdmin(filters: {
    approvalStatus?: ProductApprovalStatus;
    search?: string;
    vendorProfileId?: string;
    isActive?: boolean;
  }) {
    const search = filters.search?.trim();

    return prisma.product.findMany({
      where: {
        ...(filters.approvalStatus
          ? { approvalStatus: filters.approvalStatus }
          : {}),
        ...(filters.vendorProfileId
          ? { vendorProfileId: filters.vendorProfileId }
          : {}),
        ...(filters.isActive !== undefined
          ? { isActive: filters.isActive }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                {
                  vendorProfile: {
                    storeName: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  vendorProfile: {
                    user: { email: { contains: search, mode: "insensitive" } },
                  },
                },
                {
                  vendorProfile: {
                    user: {
                      fullName: { contains: search, mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : {}),
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

  updateRatingAggregate(id: string, input: { ratingAverage: number; reviewCount: number }) {
    return prisma.product.update({
      where: { id },
      data: {
        ratingAverage: input.ratingAverage,
        reviewCount: input.reviewCount,
      },
      select: { id: true, ratingAverage: true, reviewCount: true },
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

  private buildPublicWhere(filters: {
    categoryIds?: string[];
    vendorStoreSlugs?: string[];
    search?: string;
    minPriceMinor?: number;
    maxPriceMinor?: number;
    inStock?: boolean;
    productIds?: string[];
  }): Prisma.ProductWhereInput {
    const vendorStoreSlugs = filters.vendorStoreSlugs?.filter(Boolean);
    const andClauses: Prisma.ProductWhereInput[] = [];

    if (filters.search) {
      andClauses.push({
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
          {
            sku: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
          {
            vendorProfile: {
              storeName: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
          },
          {
            category: {
              name: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
          },
        ],
      });
    }

    if (filters.inStock) {
      andClauses.push({
        OR: [
          { stockQty: { gt: 0 } },
          {
            variants: {
              some: {
                isActive: true,
                stockQty: { gt: 0 },
              },
            },
          },
        ],
      });
    }

    return {
      approvalStatus: "APPROVED",
      isActive: true,
      ...(filters.productIds
        ? {
            id: {
              in: filters.productIds,
            },
          }
        : {}),
      ...(filters.categoryIds?.length
        ? {
            categoryId: {
              in: filters.categoryIds,
            },
          }
        : {}),
      ...(filters.minPriceMinor != null || filters.maxPriceMinor != null
        ? {
            priceAmount: {
              ...(filters.minPriceMinor != null
                ? { gte: filters.minPriceMinor }
                : {}),
              ...(filters.maxPriceMinor != null
                ? { lte: filters.maxPriceMinor }
                : {}),
            },
          }
        : {}),
      vendorProfile: vendorStoreSlugs?.length
        ? {
            storeSlug: {
              in: vendorStoreSlugs,
            },
            status: "ACTIVE",
          }
        : {
            status: "ACTIVE",
          },
      ...(andClauses.length > 0 ? { AND: andClauses } : {}),
    };
  }

  private buildPublicOrderBy(
    sort?: "newest" | "price-asc" | "price-desc" | "rating" | "relevance"
  ): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case "price-asc":
        return { priceAmount: "asc" };
      case "price-desc":
        return { priceAmount: "desc" };
      case "rating":
        return { ratingAverage: "desc" };
      case "relevance":
      case "newest":
      default:
        return { createdAt: "desc" };
    }
  }

  async listPublic(filters: {
    categoryIds?: string[];
    vendorStoreSlugs?: string[];
    search?: string;
    minPriceMinor?: number;
    maxPriceMinor?: number;
    inStock?: boolean;
    productIds?: string[];
    sort?: "newest" | "price-asc" | "price-desc" | "rating" | "relevance";
    skip?: number;
    take?: number;
  }) {
    const where = this.buildPublicWhere(filters);
    const orderBy = this.buildPublicOrderBy(filters.sort);

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" as const },
          },
          vendorProfile: true,
        },
        orderBy,
        ...(filters.skip != null ? { skip: filters.skip } : {}),
        ...(filters.take != null ? { take: filters.take } : {}),
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  countPublic(filters: {
    categoryIds?: string[];
    vendorStoreSlugs?: string[];
    search?: string;
    minPriceMinor?: number;
    maxPriceMinor?: number;
    inStock?: boolean;
    productIds?: string[];
  }) {
    return prisma.product.count({
      where: this.buildPublicWhere(filters),
    });
  }

  groupPublicByCategory(filters: {
    categoryIds?: string[];
    vendorStoreSlugs?: string[];
    search?: string;
    minPriceMinor?: number;
    maxPriceMinor?: number;
    inStock?: boolean;
    productIds?: string[];
  }) {
    return prisma.product.groupBy({
      by: ["categoryId"],
      where: this.buildPublicWhere(filters),
      _count: { _all: true },
    });
  }

  groupPublicByVendor(filters: {
    categoryIds?: string[];
    vendorStoreSlugs?: string[];
    search?: string;
    minPriceMinor?: number;
    maxPriceMinor?: number;
    inStock?: boolean;
    productIds?: string[];
  }) {
    return prisma.product.groupBy({
      by: ["vendorProfileId"],
      where: this.buildPublicWhere(filters),
      _count: { _all: true },
    });
  }

  aggregatePublicPrice(filters: {
    categoryIds?: string[];
    vendorStoreSlugs?: string[];
    search?: string;
    minPriceMinor?: number;
    maxPriceMinor?: number;
    inStock?: boolean;
    productIds?: string[];
  }) {
    return prisma.product.aggregate({
      where: this.buildPublicWhere(filters),
      _min: { priceAmount: true },
      _max: { priceAmount: true },
    });
  }
}
