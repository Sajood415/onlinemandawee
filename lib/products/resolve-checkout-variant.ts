import type { CatalogVariant } from "@/lib/products/public-catalog";
import {
  getActiveCatalogVariants,
  resolveVariantUnitPriceMinor,
} from "@/lib/products/public-catalog";

export class CheckoutVariantResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutVariantResolutionError";
  }
}

export function resolveCheckoutVariantSelection(input: {
  variants?: CatalogVariant[];
  requestedVariantId?: string | null;
  productName?: string;
}) {
  const activeVariants = getActiveCatalogVariants(input.variants);
  const label = input.productName ? `"${input.productName}"` : "This product";

  if (activeVariants.length === 0) {
    return { variant: null as CatalogVariant | null, variantId: null as string | null };
  }

  const autoVariantId =
    input.requestedVariantId ??
    (activeVariants.length === 1 ? activeVariants[0]?.id : undefined);

  if (!autoVariantId) {
    throw new CheckoutVariantResolutionError(
      `${label} has multiple SKU options. Choose a variant on the product page before checkout.`
    );
  }

  const variant = activeVariants.find((entry) => entry.id === autoVariantId) ?? null;
  if (!variant) {
    throw new CheckoutVariantResolutionError(
      `${label}: the selected SKU option is no longer available. Remove it from your cart and add the product again.`
    );
  }

  return { variant, variantId: variant.id };
}

export function resolveCheckoutUnitPriceMinor(input: {
  basePriceAmount: number;
  variants?: CatalogVariant[];
  variantId?: string | null;
  productName?: string;
}) {
  const { variant } = resolveCheckoutVariantSelection({
    variants: input.variants,
    requestedVariantId: input.variantId,
    productName: input.productName,
  });

  if (!variant) {
    return input.basePriceAmount;
  }

  return resolveVariantUnitPriceMinor(input.basePriceAmount, variant);
}

export function resolveProductPriceRangeMinor(input: {
  basePriceAmount: number;
  variants?: CatalogVariant[];
}) {
  const activeVariants = getActiveCatalogVariants(input.variants);
  if (activeVariants.length === 0) {
    return { min: input.basePriceAmount, max: input.basePriceAmount };
  }

  const prices = activeVariants.map((variant) =>
    resolveVariantUnitPriceMinor(input.basePriceAmount, variant)
  );

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function formatProductPriceRangeMinor(
  range: { min: number; max: number },
  currency: string
) {
  if (range.min === range.max) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(range.min / 100);
    } catch {
      return `${currency} ${(range.min / 100).toFixed(2)}`;
    }
  }

  const fmt = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount / 100);
    } catch {
      return `${currency} ${(amount / 100).toFixed(2)}`;
    }
  };

  return `${fmt(range.min)} – ${fmt(range.max)}`;
}
