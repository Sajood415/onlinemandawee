import productData from "@/data/product.json";
import type { IndustryType } from "@/domain/vendor/vendor-types";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { getVendorProducts } from "@/lib/products/vendor-directory";
import { staticVendorIndustryTypes } from "@/lib/vendors/static-vendor-industries";

export type PublicVendorListing = {
  id: string;
  storeName: string;
  storeSlug: string;
  logoUrl: string | null;
  description: string | null;
  industryType: IndustryType | null;
  productCount: number;
};

type ApiVendorListing = PublicVendorListing;

const staticVendorProfiles = productData.vendorProfiles ?? [];

function mapStaticVendor(profile: (typeof staticVendorProfiles)[number]): PublicVendorListing {
  const industryType = staticVendorIndustryTypes[profile.slug] ?? null;
  return {
    id: profile.id,
    storeName: profile.name,
    storeSlug: profile.slug,
    logoUrl: profile.logo,
    description: profile.description.en,
    industryType,
    productCount: getVendorProducts(profile.slug).length,
  };
}

export async function fetchPublicVendorListings(filters?: {
  industry?: IndustryType;
}): Promise<PublicVendorListing[]> {
  const params = new URLSearchParams();
  if (filters?.industry) params.set("industry", filters.industry);

  const qs = params.toString();
  let apiVendors: ApiVendorListing[] = [];

  try {
    const res = await fetch(`/api/catalog/vendors${qs ? `?${qs}` : ""}`);
    apiVendors = await parseApiResponse<ApiVendorListing[]>(res);
  } catch {
    apiVendors = [];
  }

  const staticVendors = staticVendorProfiles
    .map(mapStaticVendor)
    .filter((vendor) =>
      filters?.industry ? vendor.industryType === filters.industry : true
    );

  const seen = new Set<string>();
  const merged: PublicVendorListing[] = [];

  for (const vendor of [...apiVendors, ...staticVendors]) {
    const key = vendor.storeSlug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(vendor);
  }

  return merged.sort((a, b) => a.storeName.localeCompare(b.storeName));
}
