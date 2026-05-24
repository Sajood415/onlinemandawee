import type { PublicCatalogProduct } from "@/lib/products/public-catalog";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import productData from "@/data/product.json";

export type CatalogRow = (typeof productData.featuredProducts)[number] | PublicCatalogProduct;

export type CategoryOption = {
  id: string;
  label: Record<SupportedLocale, string>;
};

export type ProductSortBy = "featured" | "price-low" | "price-high" | "rating";

export type ProductsFilterState = {
  searchQuery: string;
  selectedCategory: string;
  selectedVendor: string[];
  priceRange: [number, number];
  sortBy: ProductSortBy;
};
