"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { ProductsActiveFilterChips } from "@/components/products/ProductsActiveFilterChips";
import { ProductsCatalogHeader } from "@/components/products/ProductsCatalogHeader";
import { ProductsFilterSidebar } from "@/components/products/ProductsFilterSidebar";
import { ProductsMobileFiltersSheet } from "@/components/products/ProductsMobileFiltersSheet";
import { ProductPlpCard } from "@/components/products/ProductPlpCard";
import { ProductsPagination } from "@/components/products/ProductsPagination";
import { ProductsSortBar } from "@/components/products/ProductsSortBar";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import {
  catalogStateToSearchParams,
  countActiveCatalogFilters,
  parseCatalogUrlState,
  type CatalogUrlState,
} from "@/lib/products/catalog-url-state";
import {
  fetchPublicCatalogPage,
  type CatalogFacets,
  type PublicCatalogProduct,
  type PublicCatalogSort,
} from "@/lib/products/public-catalog";

const PAGE_SIZE = 24;
const EMPTY_FACETS: CatalogFacets = {
  categories: [],
  vendors: [],
  priceMin: 0,
  priceMax: 0,
  inStockCount: 0,
  onSaleCount: 0,
};

export function ProductsCatalogShowcase() {
  const t = useTranslations("ProductsPages.catalog");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlState = useMemo(
    () => parseCatalogUrlState(searchParams),
    [searchParams]
  );

  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [facets, setFacets] = useState<CatalogFacets>(EMPTY_FACETS);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const replaceState = useCallback(
    (next: CatalogUrlState) => {
      const params = catalogStateToSearchParams(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const patchState = useCallback(
    (patch: Partial<CatalogUrlState>, resetPage = true) => {
      replaceState({
        ...urlState,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? urlState.page),
      });
    },
    [replaceState, urlState]
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    void fetchPublicCatalogPage({
      category: urlState.category || undefined,
      vendors: urlState.vendors,
      search: urlState.search || undefined,
      page: urlState.page,
      pageSize: PAGE_SIZE,
      sort: urlState.search.trim()
        ? urlState.sort === "newest"
          ? "relevance"
          : urlState.sort
        : urlState.sort === "relevance"
          ? "newest"
          : urlState.sort,
      minPrice: urlState.minPrice ?? undefined,
      maxPrice: urlState.maxPrice ?? undefined,
      inStock: urlState.inStock || undefined,
      onSale: urlState.onSale || undefined,
    })
      .then((page) => {
        if (!mounted) return;
        setProducts(page.items);
        setFacets(page.facets);
        setTotal(page.total);
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
        setFacets(EMPTY_FACETS);
        setTotal(0);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [urlState]);

  const categoryMeta = useMemo(() => {
    if (!urlState.category) return null;
    for (const category of facets.categories) {
      if (category.slug === urlState.category) {
        return {
          slug: category.slug,
          name: category.name,
          label: resolveCategoryLabel(category.slug, category.name, locale),
        };
      }
      for (const child of category.children) {
        if (child.slug === urlState.category) {
          return {
            slug: child.slug,
            name: child.name,
            label: resolveCategoryLabel(child.slug, child.name, locale),
          };
        }
      }
    }
    return { slug: urlState.category, name: urlState.category, label: urlState.category };
  }, [facets.categories, locale, urlState.category]);

  const title = urlState.search.trim()
    ? t("searchTitle")
    : categoryMeta
      ? categoryMeta.label
      : t("title");

  const subtitle = urlState.search.trim()
    ? t("searchSubtitle", { query: urlState.search.trim() })
    : undefined;

  const from = total === 0 ? 0 : (urlState.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(urlState.page * PAGE_SIZE, total);
  const showingLabel =
    total === 0 ? t("results", { count: 0 }) : t("showing", { from, to, total });

  const filterDraft = {
    category: urlState.category,
    vendors: urlState.vendors,
    minPrice: urlState.minPrice,
    maxPrice: urlState.maxPrice,
    inStock: urlState.inStock,
    onSale: urlState.onSale,
  };

  const chips = useMemo(() => {
    const items: Array<{ id: string; label: string }> = [];
    if (urlState.search.trim()) {
      items.push({ id: "search", label: `“${urlState.search.trim()}”` });
    }
    if (categoryMeta) {
      items.push({ id: "category", label: categoryMeta.label });
    }
    for (const slug of urlState.vendors) {
      const vendor = facets.vendors.find((entry) => entry.storeSlug === slug);
      items.push({ id: `vendor:${slug}`, label: vendor?.storeName ?? slug });
    }
    if (urlState.minPrice != null) {
      items.push({ id: "minPrice", label: `${t("minPrice")} ${urlState.minPrice}` });
    }
    if (urlState.maxPrice != null) {
      items.push({ id: "maxPrice", label: `${t("maxPrice")} ${urlState.maxPrice}` });
    }
    if (urlState.inStock) items.push({ id: "inStock", label: t("inStock") });
    if (urlState.onSale) items.push({ id: "onSale", label: t("onSale") });
    return items;
  }, [categoryMeta, facets.vendors, t, urlState]);

  const removeChip = (id: string) => {
    if (id === "search") patchState({ search: "" });
    else if (id === "category") patchState({ category: "" });
    else if (id.startsWith("vendor:")) {
      const slug = id.slice("vendor:".length);
      patchState({ vendors: urlState.vendors.filter((entry) => entry !== slug) });
    } else if (id === "minPrice") patchState({ minPrice: null });
    else if (id === "maxPrice") patchState({ maxPrice: null });
    else if (id === "inStock") patchState({ inStock: false });
    else if (id === "onSale") patchState({ onSale: false });
  };

  const clearAll = () => {
    replaceState({
      search: "",
      category: "",
      vendors: [],
      minPrice: null,
      maxPrice: null,
      inStock: false,
      onSale: false,
      sort: "newest",
      page: 1,
    });
  };

  const popularCategories = facets.categories.filter((category) => category.count > 0).slice(0, 8);
  const showCategoryChips = !urlState.category && !urlState.search.trim() && popularCategories.length > 0;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      <div className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-6 sm:py-8">
        <ProductsCatalogHeader
          title={title}
          subtitle={subtitle}
          isRtl={isRtl}
          categoryLabel={categoryMeta?.label}
        />

        {showCategoryChips ? (
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              {t("browseCategories")}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {popularCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => patchState({ category: category.slug })}
                  className="shrink-0 border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-[#0F3460]/30 hover:text-[#0F3460]"
                >
                  {resolveCategoryLabel(category.slug, category.name, locale)}
                  <span className="ms-1.5 text-xs text-neutral-400">{category.count}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <ProductsFilterSidebar
                facets={facets}
                value={filterDraft}
                onChange={(next) => patchState(next)}
                locale={locale}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <ProductsSortBar
              sort={urlState.sort}
              onSortChange={(sort: PublicCatalogSort) => patchState({ sort })}
              activeFilterCount={countActiveCatalogFilters(urlState)}
              onOpenFilters={() => setMobileFiltersOpen(true)}
              showingLabel={showingLabel}
            />

            <ProductsActiveFilterChips
              chips={chips}
              onRemove={removeChip}
              onClearAll={clearAll}
            />

            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0F3460]/40" />
              </div>
            ) : products.length === 0 ? (
              <div className="border border-neutral-200/80 bg-white px-6 py-16 text-center">
                <h2 className="text-xl font-bold text-neutral-900">{t("noProducts")}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{t("noProductsHint")}</p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-6 inline-flex bg-[#0F3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
                >
                  {t("clearFilters")}
                </button>
                <div className="mt-4">
                  <Link
                    href="/products"
                    className="text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
                  >
                    {t("title")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 xl:gap-4">
                  {products.map((product, index) => (
                    <ProductPlpCard
                      key={product.id}
                      product={product}
                      priority={index < 4}
                    />
                  ))}
                </div>
                <ProductsPagination
                  page={urlState.page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={(page) => patchState({ page }, false)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <ProductsMobileFiltersSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        facets={facets}
        value={filterDraft}
        resultCount={total}
        locale={locale}
        isRtl={isRtl}
        onApply={(next) => patchState(next)}
      />
    </div>
  );
}
