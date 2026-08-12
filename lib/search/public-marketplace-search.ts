import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { ApiCatalogProduct } from "@/lib/products/public-catalog";
import type { PublicVendorListing } from "@/lib/vendors/public-vendor-listing";

export type MarketplaceSearchPlace = {
  kind: "city" | "country";
  label: string;
  href: string;
};

export type MarketplaceSearchIndustry = {
  slug: string;
  label: string;
  href: string;
};

export type MarketplaceSearchResult = {
  query: string;
  products: ApiCatalogProduct[];
  productTotal: number;
  vendors: PublicVendorListing[];
  industries: MarketplaceSearchIndustry[];
  places: MarketplaceSearchPlace[];
};

export async function fetchMarketplaceSearch(
  q: string,
  locale: string
): Promise<MarketplaceSearchResult> {
  const params = new URLSearchParams({
    q,
    locale,
  });
  const res = await fetch(`/api/catalog/search?${params.toString()}`);
  return parseApiResponse<MarketplaceSearchResult>(res);
}
