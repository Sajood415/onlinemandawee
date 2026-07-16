import type { PublicCatalogSort } from "@/lib/products/public-catalog";

export type CatalogUrlState = {
  search: string;
  category: string;
  vendors: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  onSale: boolean;
  sort: PublicCatalogSort;
  page: number;
};

export const DEFAULT_CATALOG_SORT: PublicCatalogSort = "newest";

export function parseCatalogUrlState(searchParams: URLSearchParams): CatalogUrlState {
  const vendorsParam = searchParams.get("vendors");
  const vendors = vendorsParam
    ? vendorsParam
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  const sortRaw = searchParams.get("sort");
  const sort: PublicCatalogSort =
    sortRaw === "price-asc" ||
    sortRaw === "price-desc" ||
    sortRaw === "rating" ||
    sortRaw === "relevance" ||
    sortRaw === "newest"
      ? sortRaw
      : DEFAULT_CATALOG_SORT;

  const minPriceRaw = searchParams.get("minPrice");
  const maxPriceRaw = searchParams.get("maxPrice");
  const pageRaw = Number(searchParams.get("page") ?? "1");

  return {
    search: searchParams.get("search") ?? "",
    category: searchParams.get("category") ?? "",
    vendors,
    minPrice: minPriceRaw != null && minPriceRaw !== "" ? Number(minPriceRaw) : null,
    maxPrice: maxPriceRaw != null && maxPriceRaw !== "" ? Number(maxPriceRaw) : null,
    inStock: searchParams.get("inStock") === "true",
    onSale: searchParams.get("onSale") === "true",
    sort,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
  };
}

export function catalogStateToSearchParams(state: CatalogUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search.trim()) params.set("search", state.search.trim());
  if (state.category) params.set("category", state.category);
  if (state.vendors.length) params.set("vendors", state.vendors.join(","));
  if (state.minPrice != null) params.set("minPrice", String(state.minPrice));
  if (state.maxPrice != null) params.set("maxPrice", String(state.maxPrice));
  if (state.inStock) params.set("inStock", "true");
  if (state.onSale) params.set("onSale", "true");
  if (state.sort && state.sort !== DEFAULT_CATALOG_SORT) params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

export function countActiveCatalogFilters(state: CatalogUrlState) {
  let count = 0;
  if (state.search.trim()) count += 1;
  if (state.category) count += 1;
  count += state.vendors.length;
  if (state.minPrice != null) count += 1;
  if (state.maxPrice != null) count += 1;
  if (state.inStock) count += 1;
  if (state.onSale) count += 1;
  return count;
}
