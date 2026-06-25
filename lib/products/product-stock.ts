export type StockVariant = {
  id: string;
  name: string;
  stockQty: number;
  isActive?: boolean;
};

export type ProductStockSource = {
  stockQty: number;
  variants?: StockVariant[];
};

export function getActiveStockVariants(product: ProductStockSource) {
  return (product.variants ?? []).filter((variant) => variant.isActive !== false);
}

export function usesVariantStock(product: ProductStockSource) {
  return getActiveStockVariants(product).length > 0;
}

export function resolveAvailableStockQty(
  product: ProductStockSource,
  variantId?: string | null
) {
  const activeVariants = getActiveStockVariants(product);

  if (activeVariants.length === 0) {
    return Math.max(0, product.stockQty);
  }

  if (variantId) {
    const variant = activeVariants.find((entry) => entry.id === variantId);
    return Math.max(0, variant?.stockQty ?? 0);
  }

  return activeVariants.reduce((sum, variant) => sum + Math.max(0, variant.stockQty), 0);
}

export function isProductInStock(product: ProductStockSource, variantId?: string | null) {
  return resolveAvailableStockQty(product, variantId) > 0;
}

export function getProductStockStatusLabel(
  product: ProductStockSource,
  variantId?: string | null
) {
  return isProductInStock(product, variantId) ? "In Stock" : "Sold Out";
}

export function formatVendorStockSummary(product: ProductStockSource) {
  if (usesVariantStock(product)) {
    const activeVariants = getActiveStockVariants(product);
    const total = activeVariants.reduce((sum, variant) => sum + Math.max(0, variant.stockQty), 0);
    const soldOutCount = activeVariants.filter((variant) => variant.stockQty <= 0).length;

    if (total <= 0) {
      return { label: "Sold out", tone: "danger" as const, total: 0 };
    }

    if (soldOutCount > 0) {
      return {
        label: `${total} total (${soldOutCount} variant${soldOutCount === 1 ? "" : "s"} sold out)`,
        tone: "warn" as const,
        total,
      };
    }

    return { label: `${total} in stock`, tone: "ok" as const, total };
  }

  if (product.stockQty <= 0) {
    return { label: "Sold out", tone: "danger" as const, total: 0 };
  }

  return { label: `${product.stockQty} in stock`, tone: "ok" as const, total: product.stockQty };
}

export function assertSufficientStock(
  product: ProductStockSource,
  quantity: number,
  variantId?: string | null
) {
  const available = resolveAvailableStockQty(product, variantId);

  if (quantity > available) {
    return {
      ok: false as const,
      available,
      message:
        available <= 0
          ? "This item is sold out."
          : `Only ${available} item${available === 1 ? "" : "s"} left in stock.`,
    };
  }

  return { ok: true as const, available };
}
