/**
 * Seeds the Category collection with food / grocery categories.
 * Safe to re-run — skips any category whose slug already exists.
 *
 * Usage:
 *   node --import tsx scripts/seed-categories.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FOOD_CATEGORIES = [
  // ── Grains & Staples ─────────────────────────────────────────────────
  { name: "Rice & Grains",          slug: "rice-grains",          sortOrder: 10 },
  { name: "Flour & Bread",          slug: "flour-bread",          sortOrder: 11 },
  { name: "Pasta & Noodles",        slug: "pasta-noodles",        sortOrder: 12 },
  { name: "Legumes & Pulses",       slug: "legumes-pulses",       sortOrder: 13 },

  // ── Meat & Seafood ───────────────────────────────────────────────────
  { name: "Beef & Lamb",            slug: "beef-lamb",            sortOrder: 20 },
  { name: "Poultry",                slug: "poultry",              sortOrder: 21 },
  { name: "Fish & Seafood",         slug: "fish-seafood",         sortOrder: 22 },

  // ── Dairy & Eggs ─────────────────────────────────────────────────────
  { name: "Dairy Products",         slug: "dairy",                sortOrder: 30 },
  { name: "Eggs",                   slug: "eggs",                 sortOrder: 31 },

  // ── Fruits & Vegetables ──────────────────────────────────────────────
  { name: "Fresh Fruits",           slug: "fruits",               sortOrder: 40 },
  { name: "Fresh Vegetables",       slug: "vegetables",           sortOrder: 41 },
  { name: "Dried Fruits & Nuts",    slug: "dried-fruits-nuts",    sortOrder: 42 },
  { name: "Pickles & Preserves",    slug: "pickles-preserves",    sortOrder: 43 },

  // ── Cooking Essentials ───────────────────────────────────────────────
  { name: "Cooking Oils",           slug: "cooking-oils",         sortOrder: 50 },
  { name: "Spices & Herbs",         slug: "spices-herbs",         sortOrder: 51 },
  { name: "Sauces & Condiments",    slug: "sauces-condiments",    sortOrder: 52 },
  { name: "Salt, Sugar & Sweeteners", slug: "salt-sugar-sweeteners", sortOrder: 53 },
  { name: "Vinegar & Dressings",    slug: "vinegar-dressings",    sortOrder: 54 },

  // ── Bakery ──────────────────────────────────────────────────────────
  { name: "Bread & Baked Goods",    slug: "bread-baked-goods",    sortOrder: 60 },
  { name: "Cakes & Pastries",       slug: "cakes-pastries",       sortOrder: 61 },
  { name: "Cookies & Biscuits",     slug: "cookies-biscuits",     sortOrder: 62 },

  // ── Snacks ──────────────────────────────────────────────────────────
  { name: "Chips & Crisps",         slug: "chips-crisps",         sortOrder: 70 },
  { name: "Chocolate & Candy",      slug: "chocolate-candy",      sortOrder: 71 },
  { name: "Snack Bar",              slug: "snacks",               sortOrder: 72 },
  { name: "Breakfast Items",        slug: "breakfast",            sortOrder: 73 },

  // ── Beverages ───────────────────────────────────────────────────────
  { name: "Tea & Coffee",           slug: "tea-coffee",           sortOrder: 80 },
  { name: "Juices & Soft Drinks",   slug: "beverages",            sortOrder: 81 },
  { name: "Water & Mineral Water",  slug: "water",                sortOrder: 82 },
  { name: "Energy & Sports Drinks", slug: "energy-drinks",        sortOrder: 83 },

  // ── Specialty ───────────────────────────────────────────────────────
  { name: "Edible Grocery",         slug: "grocery",              sortOrder: 90 },
  { name: "Honey & Natural Products", slug: "honey-natural",      sortOrder: 91 },
  { name: "Canned & Tinned Foods",  slug: "canned-foods",         sortOrder: 92 },
  { name: "Frozen Foods",           slug: "frozen-foods",         sortOrder: 93 },
  { name: "Baby Food",              slug: "baby-food",            sortOrder: 94 },
  { name: "Health Foods & Organic", slug: "health-organic",       sortOrder: 95 },
  { name: "Traditional / Afghan Foods", slug: "traditional-afghan", sortOrder: 96 },
];

async function main() {
  console.log(`Seeding ${FOOD_CATEGORIES.length} food categories…\n`);

  let created = 0;
  let skipped = 0;

  for (const cat of FOOD_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      console.log(`  ⏭  skipped  "${cat.name}" (slug already exists)`);
      skipped++;
    } else {
      await prisma.category.create({
        data: { name: cat.name, slug: cat.slug, isActive: true, sortOrder: cat.sortOrder },
      });
      console.log(`  ✅  created  "${cat.name}"`);
      created++;
    }
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
