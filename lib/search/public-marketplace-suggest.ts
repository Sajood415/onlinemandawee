import { parseApiResponse } from "@/lib/http/parse-api-response";
import type {
  MarketplaceSearchIndustry,
  MarketplaceSearchPlace,
} from "@/lib/search/public-marketplace-search";

export type SuggestProduct = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  priceAmount: number;
  currency: string;
  href: string;
};

export type SuggestVendor = {
  id: string;
  storeName: string;
  storeSlug: string;
  logoUrl: string | null;
  industryLabel: string | null;
  city: string | null;
  country: string | null;
  href: string;
};

export type MarketplaceSuggestResult = {
  query: string;
  products: SuggestProduct[];
  productTotal: number;
  vendors: SuggestVendor[];
  industries: MarketplaceSearchIndustry[];
  places: MarketplaceSearchPlace[];
};

export async function fetchMarketplaceSuggest(
  q: string,
  locale: string
): Promise<MarketplaceSuggestResult> {
  const params = new URLSearchParams({
    q,
    locale,
    suggest: "1",
  });
  const res = await fetch(`/api/catalog/search?${params.toString()}`);
  return parseApiResponse<MarketplaceSuggestResult>(res);
}
