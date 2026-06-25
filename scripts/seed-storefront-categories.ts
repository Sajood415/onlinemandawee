import { PrismaClient } from "@prisma/client";

import { STOREFRONT_DEPARTMENTS } from "../lib/categories/storefront-departments";

const prisma = new PrismaClient();

async function main() {
  for (const department of STOREFRONT_DEPARTMENTS) {
    const existing = await prisma.category.findUnique({
      where: { slug: department.slug },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: department.name,
          sortOrder: department.sortOrder,
          isActive: true,
          parentId: null,
        },
      });
      console.log(`Updated department: ${department.slug}`);
      continue;
    }

    await prisma.category.create({
      data: {
        name: department.name,
        slug: department.slug,
        sortOrder: department.sortOrder,
        isActive: true,
      },
    });
    console.log(`Created department: ${department.slug}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
