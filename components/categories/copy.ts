import type { SupportedLocale } from "@/lib/localization/product-vendor";

export function getCategoryCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    allProducts: en ? "All Products" : ps ? "ټول محصولات" : "همه محصولات",
    subcategories: en ? "Shop by type" : ps ? "د ډول له مخې وپلټئ" : "خرید بر اساس نوع",
    searchPlaceholder: en
      ? "Search in this category..."
      : ps
        ? "په دې کټګورۍ کې لټون..."
        : "جستجو در این دسته...",
    noProducts: en
      ? "No products in this category yet."
      : ps
        ? "په دې کټګورۍ کې اوس مهال محصول نشته."
        : "هنوز محصولی در این دسته وجود ندارد.",
    noSearchResults: en
      ? "No matching products in this category."
      : ps
        ? "په دې کټګورۍ کې هیڅ محصول ونه موندل شو."
        : "محصولی در این دسته یافت نشد.",
    results: (count: number) =>
      en
        ? `${count} product${count === 1 ? "" : "s"}`
        : ps
          ? `${count} محصول${count === 1 ? "" : "ات"}`
          : `${count} محصول`,
    browseAll: en ? "Browse all products" : ps ? "ټول محصولات وګورئ" : "مشاهده همه محصولات",
  };
}
