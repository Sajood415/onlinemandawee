import { prisma } from "@/lib/db/prisma";

export class ProductVariantRepository {
  listByProduct(productId: string) {
    return prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: "asc" },
    });
  }

  findById(id: string) {
    return prisma.productVariant.findUnique({ where: { id } });
  }

  create(input: {
    productId: string;
    name: string;
    priceAmount?: number | null;
    stockQty: number;
    sku?: string | null;
  }) {
    return prisma.productVariant.create({
      data: {
        productId: input.productId,
        name: input.name,
        priceAmount: input.priceAmount ?? null,
        stockQty: input.stockQty,
        sku: input.sku ?? null,
      },
    });
  }

  update(input: {
    id: string;
    name: string;
    priceAmount?: number | null;
    stockQty: number;
    sku?: string | null;
    isActive?: boolean;
  }) {
    return prisma.productVariant.update({
      where: { id: input.id },
      data: {
        name: input.name,
        priceAmount: input.priceAmount ?? null,
        stockQty: input.stockQty,
        sku: input.sku ?? null,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  delete(id: string) {
    return prisma.productVariant.delete({ where: { id } });
  }
}
