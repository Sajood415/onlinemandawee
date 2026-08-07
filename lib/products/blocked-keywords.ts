import type { ProductTranslations } from "@/lib/localization/product-content";
import { parseProductTranslations } from "@/lib/localization/product-content";

export const DEFAULT_PRODUCT_BLOCKED_KEYWORDS = [
  "cigarette",
  "cigarettes",
  "tobacco",
  "weed",
  "cannabis",
  "marijuana",
  "alcohol",
  "vape",
  "vaping",
  "drugs",
  "cocaine",
  "heroin",
  "porn",
  "weapon",
  "gun",
  "guns",
  "ammunition",
  "hashish",
  "opium",
] as const;

export function normalizeBlockedKeyword(word: string) {
  return word.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildProductScanText(input: {
  name: string;
  description: string;
  translations?: ProductTranslations | null | unknown;
}) {
  const parts = [input.name, input.description];
  const translations =
    input.translations && typeof input.translations === "object"
      ? parseProductTranslations(input.translations)
      : null;

  if (translations) {
    for (const locale of Object.keys(translations) as Array<keyof ProductTranslations>) {
      const entry = translations[locale];
      if (entry?.name) parts.push(entry.name);
      if (entry?.description) parts.push(entry.description);
    }
  }

  return parts.filter(Boolean).join("\n").toLowerCase();
}

export function findMatchedBlockedKeywords(
  scanText: string,
  keywords: Array<{ word: string; normalizedWord: string }>
) {
  const haystack = scanText.toLowerCase();
  const matched: string[] = [];

  for (const keyword of keywords) {
    const needle = keyword.normalizedWord || normalizeBlockedKeyword(keyword.word);
    if (!needle) continue;
    if (haystack.includes(needle)) {
      matched.push(keyword.word);
    }
  }

  return matched;
}
