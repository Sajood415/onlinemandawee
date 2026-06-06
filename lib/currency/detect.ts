import {
  COUNTRY_CURRENCY,
  DEFAULT_CURRENCY,
  type SupportedCurrency,
  normalizeCurrency,
} from "@/lib/currency/constants";

export function detectCurrencyFromCountry(
  countryCode: string | null | undefined
): SupportedCurrency | null {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase();
  return COUNTRY_CURRENCY[code] ?? null;
}

export function detectCurrencyFromLocale(locale: string): SupportedCurrency {
  if (locale === "en") return "USD";
  if (locale.startsWith("en-GB") || locale === "en-GB") return "GBP";
  if (locale.startsWith("en-CA")) return "CAD";
  if (locale === "ps" || locale === "fa-AF") return "USD";
  return DEFAULT_CURRENCY;
}

export function resolveInitialCurrency(input: {
  cookie?: string | null;
  stored?: string | null;
  country?: string | null;
  locale?: string;
  userPreference?: string | null;
}): SupportedCurrency {
  if (input.userPreference) {
    return normalizeCurrency(input.userPreference);
  }
  if (input.stored) {
    return normalizeCurrency(input.stored);
  }
  if (input.cookie) {
    return normalizeCurrency(input.cookie);
  }
  const fromCountry = detectCurrencyFromCountry(input.country);
  if (fromCountry) return fromCountry;
  if (input.locale) {
    return detectCurrencyFromLocale(input.locale);
  }
  return DEFAULT_CURRENCY;
}
