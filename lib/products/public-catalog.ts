import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { parseApiResponse } from "@/lib/http/parse-api-response";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80";

export type ApiCatalogProduct = {
  id: string;
  name: string;
  description: string;
  images: string[];
  sku: string | null;
  currency: string;
  priceAmount: number;
  stockQty: number;
  slug: string;
  category: { id: string; name: string; slug: string };
  vendorProfile: {
    id: string;
    storeName: string | null;
    storeSlug: string | null;
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

  const selected = variantId
    ? activeVariants.find((variant) => variant.id === variantId)
    : activeVariants[0];

  return resolveVariantUnitPriceMinor(basePriceAmount, selected);
}

export function resolveProductInStock(product: {
  stockQty: number;
  variants?: CatalogVariant[];
}) {
  const activeVariants = getActiveCatalogVariants(product.variants);
  if (activeVariants.length === 0) return product.stockQty > 0;
  return activeVariants.some((variant) => variant.stockQty > 0);
}

export function mapApiProductToCatalog(product: ApiCatalogProduct): PublicCatalogProduct {
  const priceAmountMinor = resolveProductListingUnitPriceMinor(product);
  const price = priceAmountMinor / 100;
  const currency = product.currency || "USD";
  const inStock = resolveProductInStock(product);
  const stockLabel = inStock ? "In Stock" : "Out of Stock";

  return {
    id: product.id,
    slug: product.slug,
    price,
    basePriceAmount: product.priceAmount,
    priceDisplay: formatCatalogPrice(price, currency),
    vendor: product.vendorProfile.storeName ?? "Vendor",
    image: product.images[0] ?? PLACEHOLDER_IMAGE,
    images: product.images.length > 0 ? product.images : [PLACEHOLDER_IMAGE],
    name: { en: product.name, ps: product.name, "fa-AF": product.name },
    badge: { en: stockLabel, ps: stockLabel, "fa-AF": stockLabel },
    category: product.category.slug,
    categoryName: product.category.name,
    rating: 4.5,
    reviews: 0,
    delivery: "Standard delivery",
    description: {
      en: product.description,
      ps: product.description,
      "fa-AF": product.description,
    },
    features: [],
    inStock,
    vendorSlug: product.vendorProfile.storeSlug ?? product.vendorProfile.id,
    vendorProfileId: product.vendorProfile.id,
    stockQty: product.stockQty,
    currency,
    isVendorProduct: true,
    variants: product.variants,
    availableCoupons: product.availableCoupons,
  };
}

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

    const qs = params.toString();
    const res = await fetch(`/api/catalog/products${qs ? `?${qs}` : ""}`);
    const data = await parseApiResponse<ApiCatalogProduct[]>(res);
    return data.map(mapApiProductToCatalog);
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
