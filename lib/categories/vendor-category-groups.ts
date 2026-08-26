import type { SupportedLocale } from "@/lib/localization/product-vendor";

export type VendorCategoryGroupDef = {
  slug: string;
  sortOrder: number;
  labels: Record<SupportedLocale, string>;
  /** Sidebar thumbnail when no shop-type image is available. */
  image: string;
  shopTypeSlugs: string[];
};

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&h=400&q=80`;

/** Top-level vendor browse groups → shop type subcategories (links to /vendors?industry=). */
export const VENDOR_CATEGORY_GROUPS: VendorCategoryGroupDef[] = [
  {
    slug: "fashion-accessories",
    sortOrder: 10,
    labels: {
      en: "Fashion & Accessories",
      ps: "جامې او لوازم",
      "fa-AF": "مد و زیور",
    },
    image: u("photo-1441986300917-64674bd600d8"),
    shopTypeSlugs: ["CLOTHING", "JEWELRY", "HEALTH_BEAUTY"],
  },
  {
    slug: "food-grocery",
    sortOrder: 20,
    labels: {
      en: "Food & Grocery",
      ps: "خواړه او پلور",
      "fa-AF": "مواد غذایی",
    },
    image: u("photo-1542838132-92c53300491e"),
    shopTypeSlugs: ["BAKERY", "FOOD_BEVERAGES", "DRIED_FRUITS"],
  },
  {
    slug: "home-lifestyle",
    sortOrder: 30,
    labels: {
      en: "Home & Lifestyle",
      ps: "کور او ژوند",
      "fa-AF": "خانه و سبک زندگی",
    },
    image: u("photo-1555041469-a586c61ea9bc"),
    shopTypeSlugs: ["HOME_FURNITURE", "CARPETS", "FLORISTS"],
  },
  {
    slug: "electronics-tech",
    sortOrder: 40,
    labels: {
      en: "Electronics & Tech",
      ps: "الکترونیک",
      "fa-AF": "الکترونیک",
    },
    image: u("photo-1496181133206-80ce9b88a853"),
    shopTypeSlugs: ["ELECTRONICS"],
  },
  {
    slug: "books-sports",
    sortOrder: 50,
    labels: {
      en: "Books, Sports & Toys",
      ps: "کتابونه، ورزش او لوبې",
      "fa-AF": "کتاب، ورزش و اسباب‌بازی",
    },
    image: u("photo-1495446815901-a7297e633e8d"),
    shopTypeSlugs: ["BOOKS_STATIONERY", "SPORTS_OUTDOORS", "TOYS_GAMES"],
  },
  {
    slug: "services-more",
    sortOrder: 60,
    labels: {
      en: "More Shops",
      ps: "نور پلورنځي",
      "fa-AF": "فروشگاه‌های بیشتر",
    },
    image: u("photo-1441984904996-e0b6ba687e04"),
    shopTypeSlugs: ["AUTOMOTIVE", "HANDICRAFTS", "AGRICULTURE", "OTHER"],
  },
];

export function resolveVendorGroupLabel(
  group: VendorCategoryGroupDef,
  locale: SupportedLocale | string
) {
  const key = locale as SupportedLocale;
  return group.labels[key] ?? group.labels.en;
}
