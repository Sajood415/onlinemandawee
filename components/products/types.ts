import type { PublicCatalogProduct } from "@/lib/products/public-catalog";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

export type CatalogRow =
  | {
      id: string;
      price: number;
      priceDisplay: string;
      vendor: string;
      image: string;
      images: string[];
      name: Record<SupportedLocale, string>;
      badge: Record<SupportedLocale, string>;
      category: string;
      categoryName: string;
      rating: number;
      reviews: number;
      delivery: string;
      description: Record<SupportedLocale, string>;
      features: string[];
      inStock: boolean;
      vendorSlug: string;
      vendorProfileId: string;
      stockQty: number;
      currency: string;
      isVendorProduct: true;
      variants?: PublicCatalogProduct["variants"];
      availableCoupons?: PublicCatalogProduct["availableCoupons"];
    }
  | PublicCatalogProduct;

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
