import { normalizeCurrency } from "@/lib/currency/constants";
import { convertMajorUnits, convertMinorUnits } from "@/lib/currency/convert";

export function formatMinorUnits(
  amount: number,
  currency: string,
  locale?: string
): string {
  const code = normalizeCurrency(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${code} ${(amount / 100).toFixed(2)}`;
  }
}

export function formatMajorUnits(
  amount: number,
  currency: string,
  locale?: string
): string {
  return formatMinorUnits(Math.round(amount * 100), currency, locale);
}

/** Format a price stored in `fromCurrency`, displayed in `toCurrency`. */
export function formatConvertedMajor(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  locale?: string
): string {
  const converted = convertMajorUnits(amount, fromCurrency, toCurrency);
  return formatMajorUnits(converted, toCurrency, locale);
}

export function formatConvertedMinor(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  locale?: string
): string {
  const converted = convertMinorUnits(amount, fromCurrency, toCurrency);
  return formatMinorUnits(converted, toCurrency, locale);
}
