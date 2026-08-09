import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { ShopTypeTranslationBundle } from "@/lib/shop-types/defaults";

function asJson(
  value: ShopTypeTranslationBundle | null | undefined
): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return value as Prisma.InputJsonValue;
}

export class ShopTypeRepository {
  count() {
    return prisma.shopType.count();
  }

  listAll() {
    return prisma.shopType.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  listActive() {
    return prisma.shopType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  findById(id: string) {
    return prisma.shopType.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return prisma.shopType.findUnique({ where: { slug } });
  }

  create(input: {
    slug: string;
    name: string;
    translations?: ShopTypeTranslationBundle | null;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return prisma.shopType.create({
      data: {
        slug: input.slug,
        name: input.name,
        translations: asJson(input.translations),
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  update(
    id: string,
    input: {
      name?: string;
      translations?: ShopTypeTranslationBundle | null;
      isActive?: boolean;
      sortOrder?: number;
    }
  ) {
    const data: Prisma.ShopTypeUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.translations !== undefined) {
      // Match other Json translation updates (category/product repositories).
      data.translations = (
        input.translations === null ? null : asJson(input.translations)
      ) as Prisma.InputJsonValue;
    }
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    return prisma.shopType.update({
      where: { id },
      data,
    });
  }

  deleteById(id: string) {
    return prisma.shopType.delete({ where: { id } });
  }

  countVendorsUsingSlug(slug: string) {
    return prisma.vendorProfile.count({
      where: { industryType: slug },
    });
  }
}
