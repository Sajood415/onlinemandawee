import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { buildLocalizedCategoryLabels } from "@/lib/categories/category-labels";
import {
  buildLocalizedProductContent,
  type ProductTranslations,
} from "@/lib/localization/product-content";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import {
  getProductStockStatusLabel,
  isProductInStock,
} from "@/lib/products/product-stock";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80";

export type ApiCatalogProduct = {
  id: string;
  name: string;
  description: string;
  translations?: ProductTranslations | null;
  images: string[];
  sku: string | null;
  currency: string;
  priceAmount: number;
  stockQty: number;
  slug: string;
  ratingAverage?: number;
  reviewCount?: number;
  category: { id: string; name: string; slug: string; translations?: unknown };
  vendorProfile: {
    id: string;
    storeName: string | null;
    storeSlug: string | null;
    sellerType: "PLATFORM" | "THIRD_PARTY";
    logoUrl: string | null;
    description: string | null;
  };
  variants?: CatalogVariant[];
  availableCoupons?: PublicProductCoupon[];
};

export type CatalogVariant = {
  id: string;
  name: string;
  priceAmount: number | null;
  stockQty: number;
  sku: string | null;
  isActive: boolean;
};

export type PublicProductCoupon = {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderAmount: number | null;
  label: string;
  appliesToAllProducts: boolean;
  scopeLabel: string;
};

export type PublicCatalogProduct = {
  id: string;
  slug: string;
  price: number;
  basePriceAmount: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  images: string[];
  name: Record<SupportedLocale, string>;
  badge: Record<SupportedLocale, string>;
  category: string;
  categoryName: Record<SupportedLocale, string>;
  rating: number;
  reviews: number;
  delivery: string;
  description: Record<SupportedLocale, string>;
  features: string[];
  inStock: boolean;
  vendorSlug: string;
  vendorProfileId: string;
  sellerType: "PLATFORM" | "THIRD_PARTY";
  stockQty: number;
  currency: string;
  isVendorProduct: true;
  variants?: ApiCatalogProduct["variants"];
  availableCoupons?: PublicProductCoupon[];
};

export function formatCatalogPrice(amountMajor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMajor);
  } catch {
    return `${currency} ${amountMajor.toFixed(2)}`;
  }
}

export function getActiveCatalogVariants(variants?: CatalogVariant[]) {
  return variants?.filter((variant) => variant.isActive) ?? [];
}

export function resolveVariantUnitPriceMinor(
  basePriceAmount: number,
  variant?: CatalogVariant | null
) {
  return variant?.priceAmount ?? basePriceAmount;
}

export function resolveDefaultCatalogVariant(variants?: CatalogVariant[]) {
  return getActiveCatalogVariants(variants)[0] ?? null;
}

/** Price shown on cards and as the default on the product detail page. */
export function resolveProductListingUnitPriceMinor(product: {
  priceAmount: number;
  variants?: CatalogVariant[];
}) {
  return resolveVariantUnitPriceMinor(
    product.priceAmount,
    resolveDefaultCatalogVariant(product.variants)
  );
}

export function resolveProductUnitPriceMinor(
  basePriceAmount: number,
  variants?: CatalogVariant[],
  variantId?: string | null
) {
  const activeVariants = getActiveCatalogVariants(variants);
  if (activeVariants.length === 0) return basePriceAmount;

  if (variantId) {
    const selected = activeVariants.find((variant) => variant.id === variantId);
    if (selected) {
      return resolveVariantUnitPriceMinor(basePriceAmount, selected);
    }
    return basePriceAmount;
  }

  if (activeVariants.length === 1) {
    return resolveVariantUnitPriceMinor(basePriceAmount, activeVariants[0]);
  }

  return resolveVariantUnitPriceMinor(basePriceAmount, activeVariants[0]);
}

export function resolveProductInStock(product: {
  stockQty: number;
  variants?: CatalogVariant[];
}) {
  return isProductInStock(product);
}

export function mapApiProductToCatalog(product: ApiCatalogProduct): PublicCatalogProduct {
  const priceAmountMinor = resolveProductListingUnitPriceMinor(product);
  const price = priceAmountMinor / 100;
  const currency = product.currency || "USD";
  const inStock = resolveProductInStock(product);
  const stockLabel = getProductStockStatusLabel(product);
  const localized = buildLocalizedProductContent(
    product.name,
    product.description,
    product.translations
  );
  const stockBadge = {
    en: stockLabel,
    ps: inStock ? "په موجودیت کې" : "پلورل شوی",
    "fa-AF": inStock ? "موجود" : "تمام شده",
  };

  return {
    id: product.id,
    slug: product.slug,
    price,
    basePriceAmount: product.priceAmount,
    priceDisplay: formatCatalogPrice(price, currency),
    vendor: product.vendorProfile.storeName ?? "Vendor",
    image: product.images[0] ?? PLACEHOLDER_IMAGE,
    images: product.images.length > 0 ? product.images : [PLACEHOLDER_IMAGE],
    name: localized.name,
    badge: stockBadge,
    category: product.category.slug,
    categoryName: buildLocalizedCategoryLabels(
      product.category.slug,
      product.category.name,
      product.category.translations
    ),
    rating: product.ratingAverage ?? 0,
    reviews: product.reviewCount ?? 0,
    delivery: "Standard delivery",
    description: localized.description,
    features: [],
    inStock,
    vendorSlug: product.vendorProfile.storeSlug ?? product.vendorProfile.id,
    vendorProfileId: product.vendorProfile.id,
    sellerType: product.vendorProfile.sellerType,
    stockQty: product.stockQty,
    currency,
    isVendorProduct: true,
    variants: product.variants,
    availableCoupons: product.availableCoupons,
  };
}

const LEGACY_CATALOG_PAGE_SIZE = 200;

type PublicCatalogPagePayload = {
  items: ApiCatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  facets?: unknown;
};

const catalogProductsRequests = new Map<string, Promise<PublicCatalogProduct[]>>();

function catalogProductsCacheKey(filters?: {
  category?: string;
  vendor?: string;
  search?: string;
}) {
  return JSON.stringify(filters ?? {});
}

export function invalidatePublicCatalogCache() {
  catalogProductsRequests.clear();
}

export async function fetchPublicCatalogProducts(filters?: {
  category?: string;
  vendor?: string;
  search?: string;
}) {
  const cacheKey = catalogProductsCacheKey(filters);
  const inFlight = catalogProductsRequests.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.vendor) params.set("vendor", filters.vendor);
    if (filters?.search) params.set("search", filters.search);
    // Legacy callers expect a full list; request a large first page.
    params.set("page", "1");
    params.set("pageSize", String(LEGACY_CATALOG_PAGE_SIZE));

    const qs = params.toString();
    const res = await fetch(`/api/catalog/products${qs ? `?${qs}` : ""}`);
    const data = await parseApiResponse<ApiCatalogProduct[] | PublicCatalogPagePayload>(res);
    const items = Array.isArray(data) ? data : data.items;
    return items.map(mapApiProductToCatalog);
  })();

  catalogProductsRequests.set(cacheKey, request);

  try {
    return await request;
  } catch (error) {
    catalogProductsRequests.delete(cacheKey);
    throw error;
  }
}

export async function fetchPublicCatalogProduct(productId: string) {
  const res = await fetch(`/api/catalog/products/${productId}`);
  const data = await parseApiResponse<ApiCatalogProduct>(res);
  return mapApiProductToCatalog(data);
}

export type CatalogFacetCategory = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  count: number;
  children: Array<{
    id: string;
    slug: string;
    name: string;
    parentId: string | null;
    count: number;
  }>;
};

export type CatalogFacets = {
  categories: CatalogFacetCategory[];
  vendors: Array<{ storeSlug: string; storeName: string; count: number }>;
  priceMin: number;
  priceMax: number;
  inStockCount: number;
  onSaleCount: number;
};

export type PublicCatalogSort =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "relevance";

export type FetchPublicCatalogPageParams = {
  category?: string;
  vendors?: string[];
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: PublicCatalogSort;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
};

export type PublicCatalogPage = {
  items: PublicCatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  facets: CatalogFacets;
};

export async function fetchPublicCatalogPage(
  params: FetchPublicCatalogPageParams = {}
): Promise<PublicCatalogPage> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.vendors?.length) query.set("vendors", params.vendors.join(","));
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 24));
  query.set("sort", params.sort ?? "newest");
  if (params.minPrice != null) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice != null) query.set("maxPrice", String(params.maxPrice));
  if (params.inStock) query.set("inStock", "true");
  if (params.onSale) query.set("onSale", "true");

  const res = await fetch(`/api/catalog/products?${query.toString()}`);
  const data = await parseApiResponse<PublicCatalogPagePayload>(res);

  return {
    items: (data.items ?? []).map(mapApiProductToCatalog),
    total: data.total ?? 0,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? 24,
    facets: (data.facets as CatalogFacets) ?? {
      categories: [],
      vendors: [],
      priceMin: 0,
      priceMax: 0,
      inStockCount: 0,
      onSaleCount: 0,
    },
  };
}
