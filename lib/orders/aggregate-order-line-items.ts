type MergeableOrderLineItem = {
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  productSku?: string | null;
  quantity: number;
  lineTotalAmount: number;
  unitPriceAmount: number;
};

export type AggregatedOrderLineItem = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  productSku: string | null;
  quantity: number;
  unitPriceAmount: number;
  lineTotalAmount: number;
};

function cartLineItemKey(productId: string, variantId?: string | null) {
  return `${productId}:${variantId ?? ""}`;
}

function lineItemKey(
  item: Pick<MergeableOrderLineItem, "productId" | "variantId" | "productName" | "productSku">,
  index: number
) {
  if (!item.productId) {
    return `__row__:${index}:${item.productName}:${item.productSku ?? ""}:${item.variantId ?? ""}`;
  }
  return cartLineItemKey(item.productId, item.variantId);
}

/** Combines duplicate product lines (same product + variant) into one row with summed quantity. */
export function aggregateOrderLineItemsByProduct<T extends MergeableOrderLineItem>(
  items: T[]
): AggregatedOrderLineItem[] {
  const merged = new Map<string, AggregatedOrderLineItem>();

  items.forEach((item, index) => {
    const key = lineItemKey(item, index);
    const existing = merged.get(key);

    if (existing) {
      existing.quantity += item.quantity;
      existing.lineTotalAmount += item.lineTotalAmount;
      return;
    }

    merged.set(key, {
      productId: item.productId,
      variantId: item.variantId ?? null,
      productName: item.productName,
      variantName: item.variantName ?? null,
      productSku: item.productSku ?? null,
      quantity: item.quantity,
      unitPriceAmount: item.unitPriceAmount,
      lineTotalAmount: item.lineTotalAmount,
    });
  });

  return Array.from(merged.values());
}

export function formatAggregatedProductLabel(item: {
  productName: string;
  variantName?: string | null;
  productSku?: string | null;
}) {
  const variantSuffix = item.variantName ? ` (${item.variantName})` : "";
  const skuSuffix = item.productSku ? ` · SKU ${item.productSku}` : "";
  return `${item.productName}${variantSuffix}${skuSuffix}`;
}

export function sumOrderLineItemQuantities(
  items: Array<{ quantity: number }>
): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Merges duplicate cart lines (same product + variant) before checkout pricing. */
export function mergeGuestCheckoutCartItems<
  T extends { productId: string; variantId?: string; quantity: number },
>(items: T[]): T[] {
  const merged = new Map<string, T>();

  items.forEach((item) => {
    const key = cartLineItemKey(item.productId, item.variantId);
    const existing = merged.get(key);

    if (existing) {
      existing.quantity += item.quantity;
      return;
    }

    merged.set(key, { ...item });
  });

  return Array.from(merged.values());
}

/** Merges duplicate quote/order lines while preserving extra fields on the first row. */
export function mergeLineItemsByProduct<
  T extends MergeableOrderLineItem & Record<string, unknown>,
>(items: T[]): T[] {
  const merged = new Map<string, T>();

  items.forEach((item, index) => {
    const key = lineItemKey(item, index);
    const existing = merged.get(key);

    if (existing) {
      existing.quantity += item.quantity;
      existing.lineTotalAmount += item.lineTotalAmount;
      return;
    }

    merged.set(key, { ...item });
  });

  return Array.from(merged.values());
}
