export type ShopTypeTranslationBundle = {
  ps?: { name?: string };
  "fa-AF"?: { name?: string };
};

export type DefaultShopType = {
  slug: string;
  name: string;
  translations: ShopTypeTranslationBundle;
  sortOrder: number;
  /** Default circular tile image (replaced when admin uploads). */
  image: string;
};

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&h=400&q=80`;

/** Seeded once when ShopType collection is empty. Slugs match legacy IndustryType enum. */
export const DEFAULT_SHOP_TYPES: DefaultShopType[] = [
  {
    slug: "BAKERY",
    name: "Bakery",
    sortOrder: 10,
    image: u("photo-1509440159596-0249088772ff"),
    translations: {
      ps: { name: "نانوايي" },
      "fa-AF": { name: "نانوایی" },
    },
  },
  {
    slug: "CLOTHING",
    name: "Clothing & Apparel",
    sortOrder: 20,
    image: u("photo-1441986300917-64674bd600d8"),
    translations: {
      ps: { name: "جامې او لباس" },
      "fa-AF": { name: "لباس و پوشاک" },
    },
  },
  {
    slug: "ELECTRONICS",
    name: "Electronics",
    sortOrder: 30,
    image: u("photo-1496181133206-80ce9b88a853"),
    translations: {
      ps: { name: "الکترونیکي توکي" },
      "fa-AF": { name: "الکترونیک" },
    },
  },
  {
    slug: "FLORISTS",
    name: "Florists",
    sortOrder: 40,
    image: u("photo-1490750967868-88aa4486af76"),
    translations: {
      ps: { name: "ګلاب پلورنځي" },
      "fa-AF": { name: "گل‌فروشی" },
    },
  },
  {
    slug: "DRIED_FRUITS",
    name: "Dried Fruits & Nuts",
    sortOrder: 50,
    image: u("photo-1599599810769-bcde5a160d32"),
    translations: {
      ps: { name: "وچې مېوې او مغز لرونکي" },
      "fa-AF": { name: "میوه‌های خشک و آجیل" },
    },
  },
  {
    slug: "CARPETS",
    name: "Carpets & Rugs",
    sortOrder: 60,
    image: u("photo-1578662996442-48f60103fc96"),
    translations: {
      ps: { name: "غالۍ او فرش" },
      "fa-AF": { name: "قالین و فرش" },
    },
  },
  {
    slug: "FOOD_BEVERAGES",
    name: "Food & Beverages",
    sortOrder: 70,
    image: u("photo-1542838132-92c53300491e"),
    translations: {
      ps: { name: "خواړه او مشروبات" },
      "fa-AF": { name: "مواد غذایی و نوشیدنی" },
    },
  },
  {
    slug: "JEWELRY",
    name: "Jewelry & Accessories",
    sortOrder: 80,
    image: u("photo-1515562141207-7a88fb7ce338"),
    translations: {
      ps: { name: "زیورات او لوازم" },
      "fa-AF": { name: "جواهرات و لوازم" },
    },
  },
  {
    slug: "HEALTH_BEAUTY",
    name: "Health & Beauty",
    sortOrder: 90,
    image: u("photo-1596462502278-27bfdc403348"),
    translations: {
      ps: { name: "روغتیا او ښکلا" },
      "fa-AF": { name: "سلامت و زیبایی" },
    },
  },
  {
    slug: "HOME_FURNITURE",
    name: "Home & Furniture",
    sortOrder: 100,
    image: u("photo-1555041469-a586c61ea9bc"),
    translations: {
      ps: { name: "کور او فرنیچر" },
      "fa-AF": { name: "خانه و مبلمان" },
    },
  },
  {
    slug: "SPORTS_OUTDOORS",
    name: "Sports & Outdoors",
    sortOrder: 110,
    image: u("photo-1461896836934-ffe607ba8211"),
    translations: {
      ps: { name: "ورزش او بهرني فعالیتونه" },
      "fa-AF": { name: "ورزش و فضای باز" },
    },
  },
  {
    slug: "BOOKS_STATIONERY",
    name: "Books & Stationery",
    sortOrder: 120,
    image: u("photo-1495446815901-a7297e633e8d"),
    translations: {
      ps: { name: "کتابونه او لوازم التحریر" },
      "fa-AF": { name: "کتاب و لوازم‌التحریر" },
    },
  },
  {
    slug: "TOYS_GAMES",
    name: "Toys & Games",
    sortOrder: 130,
    image: u("photo-1558060370-d644479cb6f7"),
    translations: {
      ps: { name: "لوبې او لوبې توکي" },
      "fa-AF": { name: "اسباب‌بازی و بازی" },
    },
  },
  {
    slug: "AUTOMOTIVE",
    name: "Automotive",
    sortOrder: 140,
    image: u("photo-1492144534655-ae79c964c9d7"),
    translations: {
      ps: { name: "موټر او پرزې" },
      "fa-AF": { name: "خودرو و قطعات" },
    },
  },
  {
    slug: "HANDICRAFTS",
    name: "Handicrafts & Artisan",
    sortOrder: 150,
    image: u("photo-1452860606245-08befc0ff44b"),
    translations: {
      ps: { name: "لاسي صنایع" },
      "fa-AF": { name: "صنایع دستی" },
    },
  },
  {
    slug: "AGRICULTURE",
    name: "Agriculture & Farming",
    sortOrder: 160,
    image: u("photo-1500937386664-56d1dfef232d"),
    translations: {
      ps: { name: "کرنه او زراعت" },
      "fa-AF": { name: "کشاورزی و زراعت" },
    },
  },
  {
    slug: "OTHER",
    name: "Other",
    sortOrder: 999,
    image: u("photo-1441984904996-e0b6ba687e04"),
    translations: {
      ps: { name: "نور" },
      "fa-AF": { name: "سایر" },
    },
  },
];

export const DEFAULT_SHOP_TYPE_IMAGE_BY_SLUG = Object.fromEntries(
  DEFAULT_SHOP_TYPES.map((item) => [item.slug, item.image])
) as Record<string, string>;
