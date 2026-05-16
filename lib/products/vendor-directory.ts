import productData from "@/data/product.json";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type LocalizedText = Record<SupportedLocale, string>;

export type CatalogProduct = (typeof productData.featuredProducts)[number];
export type VendorProfile = {
  id: string;
  slug: string;
  name: string;
  tagline: LocalizedText;
  description: LocalizedText;
  logo: string;
  coverImage: string;
  location: LocalizedText;
  joinedYear: number;
  rating: number;
  responseTime: LocalizedText;
  fulfillmentRate: string;
};

const vendorProfiles = (productData.vendorProfiles ?? []) as VendorProfile[];

export function getVendorProfiles() {
  return vendorProfiles;
}

export function getVendorBySlug(slug: string) {
  return vendorProfiles.find((vendor) => vendor.slug === slug) ?? null;
}

export function getVendorByName(name: string) {
  return vendorProfiles.find((vendor) => vendor.name === name) ?? null;
}

export function getVendorProducts(vendorSlug: string) {
  return productData.featuredProducts.filter(
    (product) => product.vendorSlug === vendorSlug
  );
}
