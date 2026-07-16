import type { PublicCategoryNode } from "@/lib/categories/public-category";
import type { PublicCatalogProduct } from "@/lib/products/public-catalog";

export type CategoryShowcaseTile = {
  src: string;
  href: string;
  labelKey: "duo.leftLabel" | "duo.rightLabel" | "promos.oneLabel" | "promos.twoLabel" | "promos.threeLabel" | "promos.fourLabel";
  altKey: "duo.leftAlt" | "duo.rightAlt" | "promos.oneAlt" | "promos.twoAlt" | "promos.threeAlt" | "promos.fourAlt";
};

export type CategoryShowcaseMedia = {
  heroSrc: string | null;
  duo: CategoryShowcaseTile[];
  promos: CategoryShowcaseTile[];
};

const BABY_CARE_MEDIA: CategoryShowcaseMedia = {
  heroSrc: "/category/baby-care/hero.jpg",
  duo: [
    {
      src: "/category/baby-care/duo-1.jpg",
      href: "#category-products",
      altKey: "duo.leftAlt",
      labelKey: "duo.leftLabel",
    },
    {
      src: "/category/baby-care/duo-2.jpg",
      href: "/baby-packages",
      altKey: "duo.rightAlt",
      labelKey: "duo.rightLabel",
    },
  ],
  promos: [
    {
      src: "/category/baby-care/promo-1.jpg",
      href: "#category-products",
      altKey: "promos.oneAlt",
      labelKey: "promos.oneLabel",
    },
    {
      src: "/category/baby-care/promo-2.jpg",
      href: "#category-products",
      altKey: "promos.twoAlt",
      labelKey: "promos.twoLabel",
    },
    {
      src: "/category/baby-care/promo-3.jpg",
      href: "#category-products",
      altKey: "promos.threeAlt",
      labelKey: "promos.threeLabel",
    },
    {
      src: "/category/baby-care/promo-4.jpg",
      href: "#category-products",
      altKey: "promos.fourAlt",
      labelKey: "promos.fourLabel",
    },
  ],
};

const DUO_KEYS = [
  { labelKey: "duo.leftLabel", altKey: "duo.leftAlt" },
  { labelKey: "duo.rightLabel", altKey: "duo.rightAlt" },
] as const;

const PROMO_KEYS = [
  { labelKey: "promos.oneLabel", altKey: "promos.oneAlt" },
  { labelKey: "promos.twoLabel", altKey: "promos.twoAlt" },
  { labelKey: "promos.threeLabel", altKey: "promos.threeAlt" },
  { labelKey: "promos.fourLabel", altKey: "promos.fourAlt" },
] as const;

function uniqueImages(sources: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const src of sources) {
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  return out;
}

function pickImage(pool: string[], index: number, fallback: string | null) {
  if (pool.length === 0) return fallback;
  return pool[index % pool.length] ?? fallback;
}

export function resolveCategoryShowcaseMedia(options: {
  slug: string;
  categoryImage?: string | null;
  children: PublicCategoryNode[];
  products: PublicCatalogProduct[];
}): CategoryShowcaseMedia {
  if (options.slug === "baby-care") return BABY_CARE_MEDIA;

  const childImages = options.children.map((child) => child.image).filter(Boolean) as string[];
  const productImages = options.products.map((product) => product.image).filter(Boolean);
  const pool = uniqueImages([options.categoryImage, ...childImages, ...productImages]);
  const heroSrc = pool[0] ?? null;
  const productsHref = "#category-products";

  const duo = DUO_KEYS.map((keys, index) => {
    const child = options.children[index];
    return {
      src: pickImage(pool, index + 1, heroSrc) ?? "",
      href: child ? `/category/${child.slug}` : productsHref,
      labelKey: keys.labelKey,
      altKey: keys.altKey,
    };
  }).filter((tile) => Boolean(tile.src));

  const promos = PROMO_KEYS.map((keys, index) => {
    const child = options.children[index];
    return {
      src: pickImage(pool, index + 3, heroSrc) ?? "",
      href: child ? `/category/${child.slug}` : productsHref,
      labelKey: keys.labelKey,
      altKey: keys.altKey,
    };
  }).filter((tile) => Boolean(tile.src));

  return { heroSrc, duo, promos };
}
