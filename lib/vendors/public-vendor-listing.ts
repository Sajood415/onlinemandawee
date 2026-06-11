import type { IndustryType } from "@/domain/vendor/vendor-types";
import { parseApiResponse } from "@/lib/http/parse-api-response";

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

export async function fetchPublicVendorListings(filters?: {
  industry?: IndustryType;
}): Promise<PublicVendorListing[]> {
  const params = new URLSearchParams();
  if (filters?.industry) params.set("industry", filters.industry);

  const qs = params.toString();
  try {
    const res = await fetch(`/api/catalog/vendors${qs ? `?${qs}` : ""}`);
    const apiVendors = await parseApiResponse<ApiVendorListing[]>(res);
    return apiVendors.sort((a, b) => a.storeName.localeCompare(b.storeName));
  } catch {
    return [];
  }
}
