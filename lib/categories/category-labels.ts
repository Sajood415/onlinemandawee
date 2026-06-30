import enMessages from "@/messages/en.json";
import faMessages from "@/messages/fa-AF.json";
import psMessages from "@/messages/ps.json";
import { resolveCategoryTranslatedName } from "@/lib/localization/category-content";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type CategoryTile = {
  slug: string;
  label: string;
};

function buildCategoryLabelMap(messages: typeof enMessages) {
  const tiles = messages.Homepage.store.categoryTiles as CategoryTile[];
  return new Map(tiles.map((tile) => [tile.slug, tile.label]));
}

const labelsByLocale: Record<SupportedLocale, Map<string, string>> = {
  en: buildCategoryLabelMap(enMessages),
  ps: buildCategoryLabelMap(psMessages),
  "fa-AF": buildCategoryLabelMap(faMessages),
};

export function resolveCategoryLabel(
  slug: string,
  fallbackName: string,
  locale: SupportedLocale,
  translations?: unknown
) {
  if (locale === "en") return fallbackName;

  const fromDb = resolveCategoryTranslatedName(fallbackName, locale, translations);
  if (fromDb !== fallbackName) return fromDb;

  return labelsByLocale[locale].get(slug) ?? labelsByLocale.en.get(slug) ?? fallbackName;
}

export function buildLocalizedCategoryLabels(
  slug: string,
  fallbackName: string,
  translations?: unknown
) {
  return {
    en: fallbackName,
    ps: resolveCategoryLabel(slug, fallbackName, "ps", translations),
    "fa-AF": resolveCategoryLabel(slug, fallbackName, "fa-AF", translations),
  } satisfies Record<SupportedLocale, string>;
}
