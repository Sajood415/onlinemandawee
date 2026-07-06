/**
 * Convert an amount in minor units (e.g. cents/puls) from one currency to
 * another, using a map of "value of 1 major unit of currency in AFN".
 * AFN itself must be present in the map with a rate of 1.
 */
export function convertHawalaAmountMinor(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  ratesToAfn: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amountMinor;

  const fromRate = ratesToAfn[fromCurrency];
  const toRate = ratesToAfn[toCurrency];
  if (!fromRate || !toRate) {
    throw new Error(`Missing exchange rate for ${fromCurrency} or ${toCurrency}`);
  }

  const amountMajor = amountMinor / 100;
  const afnMajor = amountMajor * fromRate;
  const convertedMajor = afnMajor / toRate;
  return Math.round(convertedMajor * 100);
}

/** The effective multiplier to go from 1 unit of `fromCurrency` to `toCurrency`. */
export function getHawalaExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  ratesToAfn: Record<string, number>
): number {
  const fromRate = ratesToAfn[fromCurrency];
  const toRate = ratesToAfn[toCurrency];
  if (!fromRate || !toRate) {
    throw new Error(`Missing exchange rate for ${fromCurrency} or ${toCurrency}`);
  }
  return fromRate / toRate;
}
