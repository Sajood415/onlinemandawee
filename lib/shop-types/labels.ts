import type { SupportedLocale } from "@/lib/localization/product-vendor";
import type { ShopTypeTranslationBundle } from "@/lib/shop-types/defaults";

export function resolveShopTypeLabel(
  name: string,
  translations: unknown,
  locale: SupportedLocale | string = "en"
): string {
  if (locale === "en") return name;
  const bundle = (translations ?? {}) as ShopTypeTranslationBundle;
  if (locale === "ps") {
    const value = bundle.ps?.name?.trim();
    if (value) return value;
  }
  if (locale === "fa-AF") {
    const value = bundle["fa-AF"]?.name?.trim();
    if (value) return value;
  }
  return name;
}

export function normalizeShopTypeSlug(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/** Zod preprocess: empty → undefined; otherwise normalize to UPPER_SNAKE slug. */
export function preprocessIndustryTypeSlug(value: unknown): string | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const slug = normalizeShopTypeSlug(value);
  return slug || undefined;
}
