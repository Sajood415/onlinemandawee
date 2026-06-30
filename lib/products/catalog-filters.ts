import { convertMajorUnits } from "@/lib/currency/convert";
import { localizedRecordSearchValues } from "@/lib/localization/product-content";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type CatalogProduct = {
  name: Record<SupportedLocale, string>;
  category: string;
  vendor: string;
  price: number;
  currency?: string;
  rating: number;
  description?: Record<SupportedLocale, string>;
  categoryName?: Record<SupportedLocale, string> | string;
};

export function getCatalogPriceInCurrency(
  product: { price: number; currency?: string },
  displayCurrency: string
) {
  const fromCurrency = product.currency ?? "USD";
  const converted = convertMajorUnits(product.price, fromCurrency, displayCurrency);
  return Math.round(converted * 100) / 100;
}

const productMatchesSearch = (
  product: CatalogProduct,
  search: string,
  locale: SupportedLocale
) => {
  const categoryNames = localizedRecordSearchValues(
    typeof product.categoryName === "string"
      ? undefined
      : product.categoryName
  );
  if (typeof product.categoryName === "string") {
    categoryNames.push(product.categoryName);
  }

  const haystack = [
    product.name.en,
    product.name.ps,
    product.name["fa-AF"],
    product.vendor,
    product.category,
    ...categoryNames,
    product.description?.en,
    product.description?.ps,
    product.description?.["fa-AF"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
};

type FilterInput = {
  searchQuery: string;
  selectedCategory: string;
  selectedVendor: string[];
  priceRange: [number, number];
  locale: SupportedLocale;
  displayCurrency: string;
  allowedCategorySlugs?: Set<string>;
};

type SortBy = "featured" | "price-low" | "price-high" | "rating";

export const filterCatalogProducts = <T extends CatalogProduct>(
  products: T[],
  input: FilterInput
) => {
  const search = input.searchQuery.trim().toLowerCase();
  return products.filter((product) => {
    const matchesSearch = search
      ? productMatchesSearch(product, search, input.locale)
      : true;
    const matchesCategory =
      input.selectedCategory === "all" ||
      (input.allowedCategorySlugs
        ? input.allowedCategorySlugs.has(product.category)
        : product.category === input.selectedCategory);
    const matchesVendor =
      input.selectedVendor.length === 0 || input.selectedVendor.includes(product.vendor);
    const displayPrice = getCatalogPriceInCurrency(product, input.displayCurrency);
    const matchesPrice =
      displayPrice >= input.priceRange[0] && displayPrice <= input.priceRange[1];
    return matchesSearch && matchesCategory && matchesVendor && matchesPrice;
  });
};

export const sortCatalogProducts = <T extends CatalogProduct>(
  products: T[],
  sortBy: SortBy,
  displayCurrency = "USD"
) => {
  return [...products].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return (
          getCatalogPriceInCurrency(a, displayCurrency) -
          getCatalogPriceInCurrency(b, displayCurrency)
        );
      case "price-high":
        return (
          getCatalogPriceInCurrency(b, displayCurrency) -
          getCatalogPriceInCurrency(a, displayCurrency)
        );
      case "rating":
        return b.rating - a.rating;
      default:
        return 0;
    }
  });
};
