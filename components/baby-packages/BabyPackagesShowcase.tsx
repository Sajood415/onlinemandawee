"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Gift, Loader2, Package } from "lucide-react";

import { ProductPlpCard } from "@/components/products/ProductPlpCard";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import {
  fetchPublicCatalogPage,
  type CatalogFacets,
  type PublicCatalogProduct,
  type PublicCatalogSort,
} from "@/lib/products/public-catalog";

const PAGE_SIZE = 24;
const BABY_CARE_CATEGORY = "baby-care";

function parseSort(value: string | null): PublicCatalogSort {
  if (
    value === "price-asc" ||
    value === "price-desc" ||
    value === "rating" ||
    value === "newest"
  ) {
    return value;
  }
  return "newest";
}

function BabyPackagesContent() {
  const t = useTranslations("BabyPackagesPages.landing");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sort = parseSort(searchParams.get("sort"));
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [facets, setFacets] = useState<CatalogFacets | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const replaceQuery = useCallback(
    (patch: { sort?: PublicCatalogSort; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextSort = patch.sort ?? sort;
      const nextPage = patch.page ?? page;

      if (nextSort === "newest") params.delete("sort");
      else params.set("sort", nextSort);

      if (nextPage <= 1) params.delete("page");
      else params.set("page", String(nextPage));

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [page, pathname, router, searchParams, sort]
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    void fetchPublicCatalogPage({
      category: BABY_CARE_CATEGORY,
      page,
      pageSize: PAGE_SIZE,
      sort,
    })
      .then((result) => {
        if (!mounted) return;
        setProducts(result.items);
        setTotal(result.total);
        setFacets(result.facets);
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
        setTotal(0);
        setFacets(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page, sort]);

  const packageGroups = useMemo(() => {
    if (!facets?.categories?.length) return [];
    const baby = facets.categories.find((item) => item.slug === BABY_CARE_CATEGORY);
    const children = baby?.children ?? [];
    if (children.length > 0) {
      return children.slice(0, 8).map((item) => ({
        slug: item.slug,
        name: resolveCategoryLabel(item.slug, item.name, locale),
        count: null as number | null,
      }));
    }
    return facets.categories
      .filter((item) => item.slug !== BABY_CARE_CATEGORY)
      .slice(0, 8)
      .map((item) => ({
        slug: item.slug,
        name: resolveCategoryLabel(item.slug, item.name, locale),
        count: item.count as number | null,
      }));
  }, [facets, locale]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingLabel = useMemo(
    () => (total === 0 ? t("results", { count: 0 }) : t("showing", { from, to, total })),
    [from, t, to, total]
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      <div className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-neutral-400">
            <Link href="/" className="transition hover:text-[#0F3460] hover:underline">
              {t("home")}
            </Link>
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <Link
              href={`/category/${BABY_CARE_CATEGORY}`}
              className="transition hover:text-[#0F3460] hover:underline"
            >
              {t("babyCare")}
            </Link>
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="text-neutral-700">{t("title")}</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                {t("title")}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{t("subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/category/${BABY_CARE_CATEGORY}`}
                className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F3460] transition hover:border-[#0F3460]/35"
              >
                <Package className="h-4 w-4" />
                {t("browseBabyCare")}
              </Link>
              <Link
                href="/gifts"
                className="inline-flex items-center gap-2 bg-[#0F3460] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
              >
                <Gift className="h-4 w-4" />
                {t("requestCustom")}
              </Link>
            </div>
          </div>
        </div>

        {packageGroups.length > 0 ? (
          <section className="mb-6 border border-neutral-200/80 bg-white px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {t("packageTypesTitle")}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">{t("packageTypesSubtitle")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {packageGroups.map((group) => (
                <Link
                  key={group.slug}
                  href={`/category/${group.slug}`}
                  className="inline-flex items-center gap-2 border border-neutral-200 bg-[#f7f8fb] px-3 py-2 text-sm font-medium text-[#0F3460] transition hover:border-[#0F3460]/35 hover:bg-white"
                >
                  <span>{group.name}</span>
                  {group.count != null ? (
                    <span className="text-xs text-neutral-400">{group.count}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
          <p className="text-sm text-neutral-500">{showingLabel}</p>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="hidden sm:inline">{t("sort")}</span>
            <select
              value={sort}
              onChange={(event) =>
                replaceQuery({
                  sort: event.target.value as PublicCatalogSort,
                  page: 1,
                })
              }
              className="border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-800 outline-none focus:border-[#0F3460]"
            >
              <option value="newest">{t("sortNewest")}</option>
              <option value="price-asc">{t("sortPriceAsc")}</option>
              <option value="price-desc">{t("sortPriceDesc")}</option>
              <option value="rating">{t("sortRating")}</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0F3460]/40" />
          </div>
        ) : products.length === 0 ? (
          <div className="border border-neutral-200/80 bg-white px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-neutral-900">{t("noProducts")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{t("noProductsHint")}</p>
            <Link
              href="/products"
              className="mt-6 inline-flex bg-[#0F3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
            >
              {t("browseProducts")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 xl:gap-4">
              {products.map((product, index) => (
                <ProductPlpCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>

            {total > PAGE_SIZE ? (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
                <p className="text-sm text-neutral-500">
                  {t("pageOf", { page, total: pageCount })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => replaceQuery({ page: page - 1 })}
                    className="border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-[#0F3460]/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("previous")}
                  </button>
                  <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => replaceQuery({ page: page + 1 })}
                    className="border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-[#0F3460]/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("next")}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function BabyPackagesShowcase() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eef1f6]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F3460]/40" />
        </div>
      }
    >
      <BabyPackagesContent />
    </Suspense>
  );
}
