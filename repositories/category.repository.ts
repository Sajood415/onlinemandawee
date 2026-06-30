import { prisma } from "@/lib/db/prisma";
import type { CategoryTranslations } from "@/lib/localization/category-content";
import { Prisma } from "@prisma/client";

export class CategoryRepository {
  create(input: {
    name: string;
    slug: string;
    translations?: CategoryTranslations;
    parentId?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        ...(input.translations
          ? { translations: input.translations as Prisma.InputJsonValue }
          : {}),
        parentId: input.parentId ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  update(input: {
    id: string;
    name: string;
    slug: string;
    translations?: CategoryTranslations | null;
    parentId?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return prisma.category.update({
      where: { id: input.id },
      data: {
        name: input.name,
        slug: input.slug,
        ...(input.translations !== undefined
          ? { translations: (input.translations ?? null) as Prisma.InputJsonValue }
          : {}),
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        ...(input.parentId !== undefined
          ? input.parentId
            ? { parent: { connect: { id: input.parentId } } }
            : { parent: { disconnect: true } }
          : {}),
      },
    });
  }

  findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  findBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  findActiveBySlug(slug: string) {
    return prisma.category.findFirst({
      where: { slug, isActive: true },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
  }

  async listActiveDescendantIds(categoryId: string) {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true },
    });

    const ids = new Set<string>();
    const visit = (id: string) => {
      ids.add(id);
      for (const category of categories) {
        if (category.parentId === id) visit(category.id);
      }
    };

    visit(categoryId);
    return Array.from(ids);
  }

  listAll() {
    return prisma.category.findMany({
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  listActive() {
    return prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null,
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }
}
