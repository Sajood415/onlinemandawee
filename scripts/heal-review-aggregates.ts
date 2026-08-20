import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";

function loadDotenv() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadDotenv();

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, ratingAverage: true, reviewCount: true },
  });

  let healed = 0;
  for (const product of products) {
    const aggregate = await prisma.productReview.aggregate({
      where: { productId: product.id, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    });

    const ratingAverage = Math.round((aggregate._avg.rating ?? 0) * 10) / 10;
    const reviewCount = aggregate._count._all;

    if (
      product.reviewCount !== reviewCount ||
      Math.abs((product.ratingAverage ?? 0) - ratingAverage) > 0.05
    ) {
      await prisma.product.update({
        where: { id: product.id },
        data: { ratingAverage, reviewCount },
      });
      healed += 1;
      console.log(
        `healed ${product.id} "${product.name}" count ${product.reviewCount}->${reviewCount} avg ${product.ratingAverage}->${ratingAverage}`
      );
    }
  }

  console.log(`done healed=${healed} of ${products.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
