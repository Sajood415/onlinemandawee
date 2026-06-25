import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BABY_CARE_SLUG = "baby-care";
const LEGACY_BABY_SLUGS = ["baby"];

async function main() {
  let babyCare = await prisma.category.findUnique({ where: { slug: BABY_CARE_SLUG } });

  if (!babyCare) {
    babyCare = await prisma.category.create({
      data: {
        name: "Baby Care",
        slug: BABY_CARE_SLUG,
        sortOrder: 9,
        isActive: true,
        parentId: null,
      },
    });
    console.log("Created Baby Care category");
  } else {
    babyCare = await prisma.category.update({
      where: { id: babyCare.id },
      data: {
        name: "Baby Care",
        parentId: null,
        isActive: true,
        sortOrder: 9,
      },
    });
    console.log("Updated Baby Care as top-level category");
  }

  for (const legacySlug of LEGACY_BABY_SLUGS) {
    const legacy = await prisma.category.findUnique({
      where: { slug: legacySlug },
      include: { children: true },
    });

    if (!legacy || legacy.id === babyCare.id) continue;

    const legacyIds = [legacy.id, ...legacy.children.map((child) => child.id)].filter(
      (id) => id !== babyCare.id
    );

    const moved = await prisma.product.updateMany({
      where: { categoryId: { in: legacyIds } },
      data: { categoryId: babyCare.id },
    });

    if (moved.count > 0) {
      console.log(`Moved ${moved.count} product(s) from "${legacy.name}" to Baby Care`);
    }

    for (const child of legacy.children) {
      if (child.id === babyCare.id) continue;
      await prisma.category.update({
        where: { id: child.id },
        data: { parentId: null },
      });
    }

    await prisma.category.update({
      where: { id: legacy.id },
      data: { isActive: false },
    });
    console.log(`Deactivated legacy category: ${legacy.name} (${legacy.slug})`);
  }

  const total = await prisma.product.count({ where: { categoryId: babyCare.id } });
  console.log(`Baby Care now has ${total} product(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
