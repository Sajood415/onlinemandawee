import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/lib/currency/constants";

export const ALL_STOREFRONT_LOCALES = ["en", "ps", "fa-AF"] as const;

export type StorefrontLocale = (typeof ALL_STOREFRONT_LOCALES)[number];

export const DEFAULT_AVAILABLE_LOCALES: StorefrontLocale[] = [
  "en",
  "ps",
  "fa-AF",
];

export const DEFAULT_AVAILABLE_CURRENCIES: SupportedCurrency[] = [
  ...SUPPORTED_CURRENCIES,
];

export const LOCALE_LABELS: Record<StorefrontLocale, string> = {
  en: "English",
  ps: "Pashto",
  "fa-AF": "Dari",
};

export const LOCALE_FLAGS: Record<StorefrontLocale, string> = {
  en: "🇺🇸",
  ps: "🇦🇫",
  "fa-AF": "🇦🇫",
};

export function isStorefrontLocale(value: string): value is StorefrontLocale {
  return (ALL_STOREFRONT_LOCALES as readonly string[]).includes(value);
}

export function normalizeAvailableLocales(
  locales: string[] | null | undefined
): StorefrontLocale[] {
  const filtered = (locales ?? DEFAULT_AVAILABLE_LOCALES).filter(isStorefrontLocale);
  return filtered.length > 0 ? filtered : ["en"];
}

export function normalizeAvailableCurrencies(
  currencies: string[] | null | undefined
): SupportedCurrency[] {
  const filtered = (currencies ?? DEFAULT_AVAILABLE_CURRENCIES).filter(
    (currency): currency is SupportedCurrency =>
      (SUPPORTED_CURRENCIES as readonly string[]).includes(currency)
  );
  return filtered.length > 0 ? filtered : [DEFAULT_CURRENCY];
}
