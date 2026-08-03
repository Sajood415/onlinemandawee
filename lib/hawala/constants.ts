/** Currencies supported by the Hawala money transfer form, in addition to AFN. */
export const HAWALA_FOREIGN_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AED",
  "SAR",
  "PKR",
] as const;

export const HAWALA_BASE_CURRENCY = "AFN" as const;

export const HAWALA_CURRENCIES = [
  HAWALA_BASE_CURRENCY,
  ...HAWALA_FOREIGN_CURRENCIES,
] as const;

export type HawalaCurrency = (typeof HAWALA_CURRENCIES)[number];

export const HAWALA_CURRENCY_LABELS: Record<HawalaCurrency, string> = {
  AFN: "AFN – Afghan Afghani",
  USD: "USD – US Dollar",
  EUR: "EUR – Euro",
  GBP: "GBP – British Pound",
  CAD: "CAD – Canadian Dollar",
  AED: "AED – UAE Dirham",
  SAR: "SAR – Saudi Riyal",
  PKR: "PKR – Pakistani Rupee",
};

/** Seed value of 1 unit of each currency expressed in AFN, used if the free API is unreachable. */
export const HAWALA_DEFAULT_RATES_TO_AFN: Record<HawalaCurrency, number> = {
  AFN: 1,
  USD: 70,
  EUR: 76,
  GBP: 88,
  CAD: 51,
  AED: 19,
  SAR: 18.6,
  PKR: 0.25,
};

/** Customer rate is this percent below the API market rate (e.g. 2 = 2% less). */
export const HAWALA_API_RATE_MINUS_PERCENT = 2;

/** Re-fetch free API rates at most this often for non-overridden currencies. */
export const HAWALA_API_SYNC_TTL_MS = 12 * 60 * 60 * 1000;

export function isHawalaCurrency(value: string): value is HawalaCurrency {
  return (HAWALA_CURRENCIES as readonly string[]).includes(value);
}
