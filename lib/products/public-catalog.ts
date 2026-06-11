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
  variants?: {
    id: string;
    name: string;
    priceAmount: number | null;
    stockQty: number;
    sku: string | null;
    isActive: boolean;
  }[];
  availableCoupons?: PublicProductCoupon[];
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

export function mapApiProductToCatalog(product: ApiCatalogProduct): PublicCatalogProduct {
  const price = product.priceAmount / 100;
  const currency = product.currency || "USD";
  const inStock = product.stockQty > 0;
  const stockLabel = inStock ? "In Stock" : "Out of Stock";

  return {
    id: product.id,
    slug: product.slug,
    price,
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
