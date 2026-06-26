"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

import { CartEmptyState } from "@/components/cart/CartEmptyState";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CartOrderSummary } from "@/components/cart/CartOrderSummary";
import { CartPageHeader } from "@/components/cart/CartPageHeader";
import { CartPageSkeleton } from "@/components/cart/CartPageSkeleton";
import { CartRecommendedProducts } from "@/components/cart/CartRecommendedProducts";
import { useCartCopy } from "@/lib/i18n/use-cart-copy";
import type { CatalogRow } from "@/components/products/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { fetchPublicCatalogProducts } from "@/lib/products/public-catalog";
import { useCart } from "@/store/cart-context";

export default function CartPage() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = useCartCopy();

  const { cart, itemCount, displayTotal, removeItem, updateQuantity, isLoading, refreshCartPrices } =
    useCart();

  const [hydrated, setHydrated] = useState(false);
  const [lineBusyId, setLineBusyId] = useState<string | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<CatalogRow[]>([]);

  useEffect(() => {
    setHydrated(true);
    void refreshCartPrices();
  }, [refreshCartPrices]);

  useEffect(() => {
    let mounted = true;
    void fetchPublicCatalogProducts()
      .then((products) => {
        if (mounted) setRecommendedProducts(products);
      })
      .catch(() => {
        if (mounted) setRecommendedProducts([]);
      });
    return () => {
      mounted = false;
    };
  }, []);


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
              products={recommendedProducts}
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

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,380px)]">
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

              <CartOrderSummary subtotal={displayTotal} itemCount={itemCount} />
            </div>

            <CartRecommendedProducts
              products={recommendedProducts}
              locale={locale}
              cartProductIds={cart.items.map((item) => item.productId)}
            />
          </>
        )}
      </div>
    </div>
  );
}
