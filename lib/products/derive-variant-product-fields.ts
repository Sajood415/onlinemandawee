export type VariantPricingRow = {
  name: string;
  priceAmount: string;
};

/** Variant rows that will be persisted (non-empty name). */
export function getNamedVariantRows<T extends VariantPricingRow>(rows: T[]) {
  return rows.filter((row) => row.name.trim().length > 0);
}

/** Parse a major-unit price string into minor units, or null when blank/invalid. */
export function parseVariantPriceMinor(priceAmount: string) {
  const trimmed = priceAmount.trim();
  if (!trimmed) return null;
  const priceRaw = Number(trimmed);
  if (!Number.isFinite(priceRaw) || priceRaw <= 0) return null;
  return Math.round(priceRaw * 100);
}

/**
 * Product-level price/stock stored when a listing uses variants.
 * Stock is always 0 — inventory lives on variants. Price is the minimum variant
 * price so catalog fallbacks stay valid for legacy checkout resolution.
 */
export function deriveProductFieldsFromVariantPrices(variantPricesMinor: number[]) {
  if (variantPricesMinor.length === 0) {
    throw new Error("At least one variant price is required.");
  }

  return {
    priceAmount: Math.min(...variantPricesMinor),
    stockQty: 0,
  };
}

export function deriveProductFieldsFromStoredVariants(
  variants: { priceAmount: number | null; isActive?: boolean }[],
  fallbackPriceAmountMinor: number
) {
  const activePrices = variants
    .filter((variant) => variant.isActive !== false)
    .map((variant) => variant.priceAmount)
    .filter((price): price is number => price != null && price > 0);

  if (activePrices.length > 0) {
    return deriveProductFieldsFromVariantPrices(activePrices);
  }

  return {
    priceAmount: fallbackPriceAmountMinor,
    stockQty: 0,
  };
}
