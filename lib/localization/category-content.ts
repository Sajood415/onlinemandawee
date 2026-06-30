import type { SupportedLocale } from "@/lib/localization/product-vendor";

export type CategoryLocaleContent = {
  name?: string;
};

export type CategoryTranslations = Partial<
  Record<Exclude<SupportedLocale, "en">, CategoryLocaleContent>
>;

const NON_EN_LOCALES = ["ps", "fa-AF"] as const satisfies ReadonlyArray<
  Exclude<SupportedLocale, "en">
>;

export function parseCategoryTranslations(raw: unknown): CategoryTranslations | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const result: CategoryTranslations = {};

  for (const locale of NON_EN_LOCALES) {
    const entry = source[locale];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const record = entry as Record<string, unknown>;
    if (typeof record.name === "string" && record.name.trim()) {
      result[locale] = { name: record.name.trim() };
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function sanitizeCategoryTranslations(
  input?: CategoryTranslations | null
): CategoryTranslations | undefined {
  if (!input) return undefined;

  const result: CategoryTranslations = {};

  for (const locale of NON_EN_LOCALES) {
    const name = input[locale]?.name?.trim();
    if (name) {
      result[locale] = { name };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function resolveCategoryTranslatedName(
  fallbackName: string,
  locale: SupportedLocale,
  translations?: CategoryTranslations | null | unknown
) {
  if (locale === "en") return fallbackName;

  const parsed = parseCategoryTranslations(translations);
  const translated = parsed?.[locale]?.name;
  return translated && translated.length > 0 ? translated : fallbackName;
}
