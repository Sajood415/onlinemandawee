"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { CartEmptyState } from "@/components/cart/CartEmptyState";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CartOrderSummary } from "@/components/cart/CartOrderSummary";
import { CartPageSkeleton } from "@/components/cart/CartPageSkeleton";
import { CartRecommendedProducts } from "@/components/cart/CartRecommendedProducts";
import type { CatalogRow } from "@/components/products/types";
import { Link } from "@/i18n/navigation";
import { useCartCopy } from "@/lib/i18n/use-cart-copy";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { fetchPublicCatalogProducts } from "@/lib/products/public-catalog";
import { useCart } from "@/store/cart-context";

export default function CartPage() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = useCartCopy();
  const tBreadcrumb = useTranslations("Cart.breadcrumb");

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
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <CartPageSkeleton />
        </div>
      </div>
    );
  }

  const hasItems = cart.items.length > 0;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-neutral-400"
        >
          <Link href="/" className="transition hover:text-[#0F3460] hover:underline">
            {tBreadcrumb("home")}
          </Link>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
          <Link href="/products" className="transition hover:text-[#0F3460] hover:underline">
            {copy.continueShopping}
          </Link>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
          <span className="text-neutral-800">{copy.title}</span>
        </nav>

        <header className="mb-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-neutral-200 pb-5">
          <h1 className="text-[1.75rem] font-bold tracking-tight text-neutral-900 sm:text-3xl">
            {copy.title}
          </h1>
          <p className="text-sm text-neutral-500">
            {itemCount} {itemCount === 1 ? copy.item : copy.items}
          </p>
        </header>

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
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <div className="mb-1 hidden grid-cols-[5.5rem_minmax(0,1fr)_7rem_6.5rem] gap-x-5 border-b border-neutral-200 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 sm:grid">
                  <span className="col-span-2">{copy.columnProduct}</span>
                  <span className="text-center">{copy.columnQty}</span>
                  <span className="text-end">{copy.total}</span>
                </div>

                <ul className="divide-y divide-neutral-200 border-b border-neutral-200">
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
                </ul>
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
