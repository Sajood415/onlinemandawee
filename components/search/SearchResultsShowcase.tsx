"use client";

import { Loader2, MapPin, Store, Tags } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ProductPlpCard } from "@/components/products/ProductPlpCard";
import { VendorCard } from "@/components/vendors/VendorCard";
import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { mapApiProductToCatalog } from "@/lib/products/public-catalog";
import {
  fetchMarketplaceSearch,
  type MarketplaceSearchResult,
} from "@/lib/search/public-marketplace-search";

export function SearchResultsShowcase() {
  const t = useTranslations("SearchPages.results");
  const locale = useLocale() as SupportedLocale;
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? searchParams.get("search") ?? "").trim();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketplaceSearchResult | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!query) {
      setResult(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchMarketplaceSearch(query, locale)
      .then((data) => {
        if (mounted) setResult(data);
      })
      .catch(() => {
        if (mounted) {
          setResult({
            query,
            products: [],
            productTotal: 0,
            vendors: [],
            industries: [],
            places: [],
          });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [locale, query]);

  const products = useMemo(
    () => (result?.products ?? []).map(mapApiProductToCatalog),
    [result?.products]
  );

  const hasAnything =
    !!result &&
    (products.length > 0 ||
      result.vendors.length > 0 ||
      result.industries.length > 0 ||
      result.places.length > 0);

  return (
    <div className="min-h-screen bg-[#eef1f6]">
      <section className="border-b border-neutral-200/80 bg-white">
        <div className="mx-auto w-full max-w-[1540px] px-3.5 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-secondary sm:text-3xl">
            {query ? t("titleWithQuery", { query }) : t("titleEmpty")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1540px] space-y-10 px-3.5 py-8 sm:px-6 lg:px-8">
        {!query ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-14 text-center">
            <p className="text-sm text-neutral-600">{t("emptyHint")}</p>
          </div>
        ) : loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-secondary/40" />
          </div>
        ) : !hasAnything ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-14 text-center">
            <p className="text-base font-semibold text-neutral-900">{t("noResults")}</p>
            <p className="mt-2 text-sm text-neutral-500">{t("noResultsHint")}</p>
            <Link
              href="/products"
              className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              {t("browseProducts")}
            </Link>
          </div>
        ) : (
          <>
            {result!.industries.length > 0 ? (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Tags className="h-4 w-4 text-secondary" />
                  <h2 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
                    {t("industriesTitle")}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result!.industries.map((industry) => (
                    <Link
                      key={industry.slug}
                      href={industry.href}
                      className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm font-medium text-secondary transition hover:border-secondary/40 hover:bg-secondary/5"
                    >
                      {industry.label}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {result!.places.length > 0 ? (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-secondary" />
                  <h2 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
                    {t("placesTitle")}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result!.places.map((place) => (
                    <Link
                      key={`${place.kind}-${place.label}`}
                      href={place.href}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-secondary/40 hover:text-secondary"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                        {place.kind === "city" ? t("city") : t("country")}
                      </span>
                      {place.label}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {result!.vendors.length > 0 ? (
              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-secondary" />
                    <h2 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
                      {t("vendorsTitle")}
                    </h2>
                  </div>
                  <Link
                    href={`/vendors?search=${encodeURIComponent(query)}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {t("seeAllVendors")}
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {result!.vendors.map((vendor) => (
                    <VendorCard key={vendor.id} vendor={vendor} />
                  ))}
                </div>
              </section>
            ) : null}

            {products.length > 0 ? (
              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
                    {t("productsTitle")}
                  </h2>
                  <Link
                    href={`/products?search=${encodeURIComponent(query)}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {t("seeAllProducts", { count: result!.productTotal })}
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {products.map((product, index) => (
                    <ProductPlpCard
                      key={product.id}
                      product={product}
                      priority={index < 4}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
