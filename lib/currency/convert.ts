import { USD_PER_MAJOR_UNIT } from "@/lib/currency/constants";

/** Convert amount in minor units (cents) from one currency to another. */
export function convertMinorUnits(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromUsd = USD_PER_MAJOR_UNIT[fromCurrency] ?? USD_PER_MAJOR_UNIT.USD;
  const toUsd = USD_PER_MAJOR_UNIT[toCurrency] ?? USD_PER_MAJOR_UNIT.USD;
  const usdMajor = (amount / 100) * fromUsd;
  return Math.round((usdMajor / toUsd) * 100);
}

/** Convert major-unit price (e.g. 19.99) between currencies. */
export function convertMajorUnits(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromUsd = USD_PER_MAJOR_UNIT[fromCurrency] ?? USD_PER_MAJOR_UNIT.USD;
  const toUsd = USD_PER_MAJOR_UNIT[toCurrency] ?? USD_PER_MAJOR_UNIT.USD;
  const usdMajor = amount * fromUsd;
  return usdMajor / toUsd;
}
