import "server-only";

import { GuestCheckoutQuoteError } from "@/lib/checkout/guest-checkout-quote-error";
import { assertSufficientStock, usesVariantStock } from "@/lib/products/product-stock";
import { prisma } from "@/lib/db/prisma";

export type StockDecrementItem = {
  productId: string;
  productName: string;
  quantity: number;
  variantId?: string | null;
};

export async function decrementStockForOrderItems(items: StockDecrementItem[]) {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: {
          variants: {
            where: { isActive: true },
          },
        },
      });

      if (!product) {
        throw new GuestCheckoutQuoteError(
          "UNAVAILABLE_ITEMS",
          "Some items in your order are no longer available."
        );
      }

      const stockCheck = assertSufficientStock(product, item.quantity, item.variantId);
      if (!stockCheck.ok) {
        throw new GuestCheckoutQuoteError(
          "INSUFFICIENT_STOCK",
          `${product.name}: ${stockCheck.message}`
        );
      }

      if (usesVariantStock(product)) {
        if (!item.variantId) {
          throw new GuestCheckoutQuoteError(
            "UNAVAILABLE_ITEMS",
            `${product.name} requires a variant selection.`
          );
        }

        const variant = product.variants.find((entry) => entry.id === item.variantId);
        if (!variant) {
          throw new GuestCheckoutQuoteError(
            "UNAVAILABLE_ITEMS",
            `${product.name} variant is no longer available.`
          );
        }

        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            stockQty: Math.max(0, variant.stockQty - item.quantity),
          },
        });
        continue;
      }

      await tx.product.update({
        where: { id: product.id },
        data: {
          stockQty: Math.max(0, product.stockQty - item.quantity),
        },
      });
    }
  });
}
