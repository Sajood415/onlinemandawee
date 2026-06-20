/** ISO 4217 codes supported in the storefront selector. */
export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = "USD";

export const CURRENCY_COOKIE = "preferred_currency";

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  USD: "USD $",
  EUR: "EUR €",
  GBP: "GBP £",
  CAD: "CAD $",
};

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
};

/** USD value of one major unit of each currency (for conversion). */
export const USD_PER_MAJOR_UNIT: Record<string, number> = {
  USD: 1,
  EUR: 1.09,
  GBP: 1.27,
  CAD: 0.74,
  AFN: 0.014,
};

/** ISO country code → default storefront currency. */
export const COUNTRY_CURRENCY: Record<string, SupportedCurrency> = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  UK: "GBP",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
};

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function normalizeCurrency(
  value: string | null | undefined,
  allowed: readonly SupportedCurrency[] = SUPPORTED_CURRENCIES
): SupportedCurrency {
  if (value && isSupportedCurrency(value) && allowed.includes(value)) {
    return value;
  }
  return allowed[0] ?? DEFAULT_CURRENCY;
}
