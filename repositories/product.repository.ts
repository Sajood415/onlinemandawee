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
    categoryIds?: string[];
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
            }
          : {}),
        ...(filters.categoryIds?.length
          ? {
              categoryId: {
                in: filters.categoryIds,
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
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" as const },
        },
        vendorProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
