import type { SupportedLocale } from "@/lib/localization/product-vendor";

type LocalizedText = Record<SupportedLocale, string>;

export type CatalogProduct = {
  id: string;
  vendorSlug: string;
};
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

const vendorProfiles: VendorProfile[] = [];

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
  void vendorSlug;
  return [] as CatalogProduct[];
}
