"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

import { CartEmptyState } from "@/components/cart/CartEmptyState";
import { CartLineItem } from "@/components/cart/CartLineItem";
import {
  CartOrderSummary,
  ESTIMATED_TAX_RATE,
  STANDARD_SHIPPING_FEE,
} from "@/components/cart/CartOrderSummary";
import { CartPageHeader } from "@/components/cart/CartPageHeader";
import { CartPageSkeleton } from "@/components/cart/CartPageSkeleton";
import { CartRecommendedProducts } from "@/components/cart/CartRecommendedProducts";
import { useCartCopy } from "@/lib/i18n/use-cart-copy";
import type { CatalogRow } from "@/components/products/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import productData from "@/data/product.json";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";

const staticProducts = productData.featuredProducts as CatalogRow[];

export default function CartPage() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = useCartCopy();

  const { cart, itemCount, displayTotal, removeItem, updateQuantity, isLoading } =
    useCart();
  const { convertPrice } = useCurrency();

  const [hydrated, setHydrated] = useState(false);
  const [lineBusyId, setLineBusyId] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const totals = useMemo(() => {
    const shippingFee = convertPrice(STANDARD_SHIPPING_FEE, "USD");
    const taxAmount = displayTotal * ESTIMATED_TAX_RATE;
    return {
      shippingFee,
      taxAmount,
      total: displayTotal + shippingFee + taxAmount,
    };
  }, [displayTotal, convertPrice]);

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      setLineBusyId(itemId);
      try {
        await updateQuantity(itemId, quantity);
      } finally {
        setLineBusyId(null);
      }
    },
    [updateQuantity]
  );

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f8fc]">
        <CartPageHeader itemCount={0} isRtl={isRtl} />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <CartPageSkeleton />
        </div>
      </div>
    );
  }

  const hasItems = cart.items.length > 0;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f8fc]">
      <CartPageHeader itemCount={itemCount} isRtl={isRtl} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {!hasItems ? (
          <>
            <CartEmptyState />
            <CartRecommendedProducts
              products={staticProducts}
              locale={locale}
              cartProductIds={[]}
            />
          </>
        ) : (
          <>
            <div className="mb-6">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f3460] transition hover:text-primary"
              >
                <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                {copy.continueShopping}
              </Link>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {cart.items.map((item) => (
                    <CartLineItem
                      key={item.id}
                      item={item}
                      busy={lineBusyId === item.id}
                      onUpdateQuantity={(quantity) =>
                        void handleUpdateQuantity(item.id, quantity)
                      }
                      onRemove={() => void removeItem(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              <CartOrderSummary
                subtotal={displayTotal}
                itemCount={itemCount}
                shippingFee={totals.shippingFee}
                taxAmount={totals.taxAmount}
                total={totals.total}
              />
            </div>

            <CartRecommendedProducts
              products={staticProducts}
              locale={locale}
              cartProductIds={cart.items.map((item) => item.productId)}
            />
          </>
        )}
      </div>
    </div>
  );
}
