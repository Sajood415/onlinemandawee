import type { SupportedLocale } from "@/lib/localization/product-vendor";

export type LocaleContent = {
  name?: string;
  description?: string;
};

export type ProductTranslations = Partial<
  Record<Exclude<SupportedLocale, "en">, LocaleContent>
>;

const NON_EN_LOCALES = ["ps", "fa-AF"] as const satisfies ReadonlyArray<
  Exclude<SupportedLocale, "en">
>;

export function parseProductTranslations(raw: unknown): ProductTranslations | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const result: ProductTranslations = {};

  for (const locale of NON_EN_LOCALES) {
    const entry = source[locale];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const cleaned: LocaleContent = {};

    if (typeof record.name === "string" && record.name.trim()) {
      cleaned.name = record.name.trim();
    }
    if (typeof record.description === "string" && record.description.trim()) {
      cleaned.description = record.description.trim();
    }

    if (Object.keys(cleaned).length > 0) {
      result[locale] = cleaned;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function sanitizeProductTranslations(
  input?: ProductTranslations | null
): ProductTranslations | undefined {
  if (!input) return undefined;

  const result: ProductTranslations = {};

  for (const locale of NON_EN_LOCALES) {
    const entry = input[locale];
    if (!entry) continue;

    const cleaned: LocaleContent = {};
    if (entry.name?.trim()) cleaned.name = entry.name.trim();
    if (entry.description?.trim()) cleaned.description = entry.description.trim();

    if (Object.keys(cleaned).length > 0) {
      result[locale] = cleaned;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function buildLocalizedStrings(
  baseEn: string,
  translations: ProductTranslations | null | undefined,
  field: keyof LocaleContent
): Record<SupportedLocale, string> {
  const psValue = translations?.ps?.[field];
  const faValue = translations?.["fa-AF"]?.[field];

  return {
    en: baseEn,
    ps: psValue && psValue.length > 0 ? psValue : baseEn,
    "fa-AF": faValue && faValue.length > 0 ? faValue : baseEn,
  };
}

export function buildLocalizedProductContent(
  name: string,
  description: string,
  translations?: ProductTranslations | null | unknown
): {
  name: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
} {
  const parsed =
    translations === undefined
      ? null
      : parseProductTranslations(translations);

  return {
    name: buildLocalizedStrings(name, parsed, "name"),
    description: buildLocalizedStrings(description, parsed, "description"),
  };
}

export function resolveLocalizedRecord(
  record: Record<SupportedLocale, string> | string | undefined,
  locale: SupportedLocale
) {
  if (!record) return "";
  if (typeof record === "string") return record;
  return record[locale] ?? record.en;
}

export function localizedRecordSearchValues(
  record?: Record<SupportedLocale, string> | string
) {
  if (!record) return [] as string[];
  if (typeof record === "string") return [record];
  return [record.en, record.ps, record["fa-AF"]];
}
