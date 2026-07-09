import { prisma } from "@/lib/db/prisma";

const publicReviewInclude = {
  user: {
    select: { fullName: true },
  },
} as const;

const adminReviewInclude = {
  user: {
    select: { fullName: true, email: true },
  },
  product: {
    select: { id: true, name: true, slug: true },
  },
} as const;

export class ProductReviewRepository {
  create(input: { productId: string; userId: string; rating: number; comment: string }) {
    return prisma.productReview.create({
      data: {
        productId: input.productId,
        userId: input.userId,
        rating: input.rating,
        comment: input.comment,
      },
      include: publicReviewInclude,
    });
  }

  findById(id: string) {
    return prisma.productReview.findUnique({
      where: { id },
      include: adminReviewInclude,
    });
  }

  async listPublicByProduct(productId: string, pagination: { page: number; pageSize: number }) {
    const where = { productId, isHidden: false };
    const [rows, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: publicReviewInclude,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.productReview.count({ where }),
    ]);

    return { rows, total };
  }

  async listForAdmin(filters: {
    search?: string;
    rating?: number;
    isHidden?: boolean;
    page: number;
    pageSize: number;
  }) {
    const search = filters.search?.trim();

    const where = {
      ...(filters.rating ? { rating: filters.rating } : {}),
      ...(filters.isHidden !== undefined ? { isHidden: filters.isHidden } : {}),
      ...(search
        ? {
            OR: [
              { comment: { contains: search, mode: "insensitive" as const } },
              { product: { name: { contains: search, mode: "insensitive" as const } } },
              { user: { fullName: { contains: search, mode: "insensitive" as const } } },
              { user: { email: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: adminReviewInclude,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.productReview.count({ where }),
    ]);

    return { rows, total };
  }

  setHidden(id: string, isHidden: boolean) {
    return prisma.productReview.update({
      where: { id },
      data: { isHidden },
      include: adminReviewInclude,
    });
  }

  delete(id: string) {
    return prisma.productReview.delete({ where: { id } });
  }

  async aggregateForProduct(productId: string) {
    const result = await prisma.productReview.aggregate({
      where: { productId, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return {
      average: result._avg.rating ?? 0,
      count: result._count._all,
    };
  }
}

export type ProductReviewRecord = NonNullable<
  Awaited<ReturnType<ProductReviewRepository["findById"]>>
>;
