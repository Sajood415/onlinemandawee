"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ChevronRight, Gift, Loader2 } from "lucide-react";

import { getGiftsCopy } from "@/components/gifts/copy";
import { ProductCard } from "@/components/products/ProductCard";
import type { CatalogRow } from "@/components/products/types";
import { filterGiftProducts } from "@/lib/gifts/filter-gift-products";
import { fetchPublicCatalogProducts } from "@/lib/products/public-catalog";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

function GiftsPageContent() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getGiftsCopy(locale);
  const [vendorProducts, setVendorProducts] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const products = await fetchPublicCatalogProducts();
        if (mounted) setVendorProducts(products);
      } catch {
        if (mounted) setVendorProducts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const giftProducts = useMemo(
    () => filterGiftProducts(vendorProducts, locale),
    [locale, vendorProducts]
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f8fc]">
      <section className="border-b border-[#0f3460]/10 bg-gradient-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {copy.home}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{copy.title}</span>
          </nav>

          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
              <Gift className="h-3.5 w-3.5" />
              {copy.badge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
              {copy.subtitle}
            </p>
            <p className="mt-3 text-sm text-white/80">
              <span className="font-semibold text-white">
                {loading ? "…" : giftProducts.length}
              </span>{" "}
              {copy.results}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0f3460]/40" />
          </div>
        ) : giftProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5 2xl:grid-cols-4">
            {giftProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                priority={index < 4}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
            <Gift className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
            <h2 className="text-xl font-bold text-neutral-900">{copy.noGifts}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{copy.noGiftsHint}</p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-xl bg-[#0f3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
            >
              {copy.browseAll}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GiftsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f6f8fc]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0f3460]/40" />
        </div>
      }
    >
      <GiftsPageContent />
    </Suspense>
  );
}
