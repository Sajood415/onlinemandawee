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

/** Seed value of 1 unit of each currency expressed in AFN, used the first time rates are read. */
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

export function isHawalaCurrency(value: string): value is HawalaCurrency {
  return (HAWALA_CURRENCIES as readonly string[]).includes(value);
}
