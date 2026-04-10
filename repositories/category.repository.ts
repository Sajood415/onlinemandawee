import { prisma } from "@/lib/db/prisma";

export class CategoryRepository {
  create(input: {
    name: string;
    slug: string;
    parentId?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
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
    parentId?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return prisma.category.update({
      where: { id: input.id },
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId ?? null,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
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
    });
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
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }
}
