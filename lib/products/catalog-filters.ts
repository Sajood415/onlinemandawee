import type { SupportedLocale } from "@/lib/localization/product-vendor";

type CatalogProduct = {
  name: Record<SupportedLocale, string>;
  category: string;
  vendor: string;
  price: number;
  rating: number;
  description?: Record<SupportedLocale, string>;
  categoryName?: string;
};

const productMatchesSearch = (
  product: CatalogProduct,
  search: string,
  locale: SupportedLocale
) => {
  const haystack = [
    product.name.en,
    product.name.ps,
    product.name["fa-AF"],
    product.vendor,
    product.category,
    product.categoryName,
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
      input.selectedCategory === "all" || product.category === input.selectedCategory;
    const matchesVendor =
      input.selectedVendor.length === 0 || input.selectedVendor.includes(product.vendor);
    const matchesPrice =
      product.price >= input.priceRange[0] && product.price <= input.priceRange[1];
    return matchesSearch && matchesCategory && matchesVendor && matchesPrice;
  });
};

export const sortCatalogProducts = <T extends CatalogProduct>(
  products: T[],
  sortBy: SortBy
) => {
  return [...products].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      default:
        return 0;
    }
  });
};
