export type ShopTypeTranslationBundle = {
  ps?: { name?: string };
  "fa-AF"?: { name?: string };
};

export type DefaultShopType = {
  slug: string;
  name: string;
  translations: ShopTypeTranslationBundle;
  sortOrder: number;
};

/** Seeded once when ShopType collection is empty. Slugs match legacy IndustryType enum. */
export const DEFAULT_SHOP_TYPES: DefaultShopType[] = [
  {
    slug: "BAKERY",
    name: "Bakery",
    sortOrder: 10,
    translations: {
      ps: { name: "نانوايي" },
      "fa-AF": { name: "نانوایی" },
    },
  },
  {
    slug: "CLOTHING",
    name: "Clothing & Apparel",
    sortOrder: 20,
    translations: {
      ps: { name: "جامې او لباس" },
      "fa-AF": { name: "لباس و پوشاک" },
    },
  },
  {
    slug: "ELECTRONICS",
    name: "Electronics",
    sortOrder: 30,
    translations: {
      ps: { name: "الکترونیکي توکي" },
      "fa-AF": { name: "الکترونیک" },
    },
  },
  {
    slug: "FLORISTS",
    name: "Florists",
    sortOrder: 40,
    translations: {
      ps: { name: "ګلاب پلورنځي" },
      "fa-AF": { name: "گل‌فروشی" },
    },
  },
  {
    slug: "DRIED_FRUITS",
    name: "Dried Fruits & Nuts",
    sortOrder: 50,
    translations: {
      ps: { name: "وچې مېوې او مغز لرونکي" },
      "fa-AF": { name: "میوه‌های خشک و آجیل" },
    },
  },
  {
    slug: "CARPETS",
    name: "Carpets & Rugs",
    sortOrder: 60,
    translations: {
      ps: { name: "غالۍ او فرش" },
      "fa-AF": { name: "قالین و فرش" },
    },
  },
  {
    slug: "FOOD_BEVERAGES",
    name: "Food & Beverages",
    sortOrder: 70,
    translations: {
      ps: { name: "خواړه او مشروبات" },
      "fa-AF": { name: "مواد غذایی و نوشیدنی" },
    },
  },
  {
    slug: "JEWELRY",
    name: "Jewelry & Accessories",
    sortOrder: 80,
    translations: {
      ps: { name: "زیورات او لوازم" },
      "fa-AF": { name: "جواهرات و لوازم" },
    },
  },
  {
    slug: "HEALTH_BEAUTY",
    name: "Health & Beauty",
    sortOrder: 90,
    translations: {
      ps: { name: "روغتیا او ښکلا" },
      "fa-AF": { name: "سلامت و زیبایی" },
    },
  },
  {
    slug: "HOME_FURNITURE",
    name: "Home & Furniture",
    sortOrder: 100,
    translations: {
      ps: { name: "کور او فرنیچر" },
      "fa-AF": { name: "خانه و مبلمان" },
    },
  },
  {
    slug: "SPORTS_OUTDOORS",
    name: "Sports & Outdoors",
    sortOrder: 110,
    translations: {
      ps: { name: "ورزش او بهرني فعالیتونه" },
      "fa-AF": { name: "ورزش و فضای باز" },
    },
  },
  {
    slug: "BOOKS_STATIONERY",
    name: "Books & Stationery",
    sortOrder: 120,
    translations: {
      ps: { name: "کتابونه او لوازم التحریر" },
      "fa-AF": { name: "کتاب و لوازم‌التحریر" },
    },
  },
  {
    slug: "TOYS_GAMES",
    name: "Toys & Games",
    sortOrder: 130,
    translations: {
      ps: { name: "لوبې او لوبې توکي" },
      "fa-AF": { name: "اسباب‌بازی و بازی" },
    },
  },
  {
    slug: "AUTOMOTIVE",
    name: "Automotive",
    sortOrder: 140,
    translations: {
      ps: { name: "موټر او پرزې" },
      "fa-AF": { name: "خودرو و قطعات" },
    },
  },
  {
    slug: "HANDICRAFTS",
    name: "Handicrafts & Artisan",
    sortOrder: 150,
    translations: {
      ps: { name: "لاسي صنایع" },
      "fa-AF": { name: "صنایع دستی" },
    },
  },
  {
    slug: "AGRICULTURE",
    name: "Agriculture & Farming",
    sortOrder: 160,
    translations: {
      ps: { name: "کرنه او زراعت" },
      "fa-AF": { name: "کشاورزی و زراعت" },
    },
  },
  {
    slug: "OTHER",
    name: "Other",
    sortOrder: 999,
    translations: {
      ps: { name: "نور" },
      "fa-AF": { name: "سایر" },
    },
  },
];
