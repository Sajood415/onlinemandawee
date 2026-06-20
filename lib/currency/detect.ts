import {
  COUNTRY_CURRENCY,
  DEFAULT_CURRENCY,
  type SupportedCurrency,
  SUPPORTED_CURRENCIES,
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
  allowedCurrencies?: readonly SupportedCurrency[];
}): SupportedCurrency {
  const allowed = input.allowedCurrencies ?? SUPPORTED_CURRENCIES;

  if (input.userPreference) {
    return normalizeCurrency(input.userPreference, allowed);
  }
  if (input.stored) {
    return normalizeCurrency(input.stored, allowed);
  }
  if (input.cookie) {
    return normalizeCurrency(input.cookie, allowed);
  }
  const fromCountry = detectCurrencyFromCountry(input.country);
  if (fromCountry && allowed.includes(fromCountry)) return fromCountry;
  if (input.locale) {
    const fromLocale = detectCurrencyFromLocale(input.locale);
    if (allowed.includes(fromLocale)) return fromLocale;
  }
  return normalizeCurrency(null, allowed);
}
