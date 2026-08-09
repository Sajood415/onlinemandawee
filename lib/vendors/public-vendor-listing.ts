import { parseApiResponse } from "@/lib/http/parse-api-response";

export type PublicVendorListing = {
  id: string;
  storeName: string;
  storeSlug: string;
  logoUrl: string | null;
  description: string | null;
  industryType: string | null;
  industryLabel?: string | null;
  productCount: number;
};

export type PublicShopTypeOption = {
  slug: string;
  label: string;
  sortOrder: number;
};

export async function fetchPublicVendorListings(filters?: {
  industry?: string;
  locale?: string;
}): Promise<PublicVendorListing[]> {
  const params = new URLSearchParams();
  if (filters?.industry) params.set("industry", filters.industry);
  if (filters?.locale) params.set("locale", filters.locale);

  const qs = params.toString();
  try {
    const res = await fetch(`/api/catalog/vendors${qs ? `?${qs}` : ""}`);
    const apiVendors = await parseApiResponse<PublicVendorListing[]>(res);
    return apiVendors.sort((a, b) => a.storeName.localeCompare(b.storeName));
  } catch {
    return [];
  }
}

export async function fetchPublicShopTypes(
  locale: string
): Promise<PublicShopTypeOption[]> {
  try {
    const res = await fetch(
      `/api/catalog/shop-types?locale=${encodeURIComponent(locale)}`
    );
    return await parseApiResponse<PublicShopTypeOption[]>(res);
  } catch {
    return [];
  }
}
