"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";

import { getProductsCopy } from "@/components/products/copy";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductsEmptyState } from "@/components/products/ProductsEmptyState";
import { ProductsFiltersPanel } from "@/components/products/ProductsFiltersPanel";
import { ProductsGridSkeleton } from "@/components/products/ProductsGridSkeleton";
import { ProductsMobileFiltersDrawer } from "@/components/products/ProductsMobileFiltersDrawer";
import { ProductsPageHeader } from "@/components/products/ProductsPageHeader";
import { ProductsToolbar } from "@/components/products/ProductsToolbar";
import type {
  CatalogRow,
  CategoryOption,
  ProductSortBy,
} from "@/components/products/types";
import {
  filterCatalogProducts,
  getCatalogPriceInCurrency,
  sortCatalogProducts,
} from "@/lib/products/catalog-filters";
import { collectCategorySlugTree } from "@/lib/categories/category-tree";
import { convertMajorUnits } from "@/lib/currency/convert";
import { formatMajorUnits } from "@/lib/currency/format";
import {
  fetchPublicCatalogProducts,
  invalidatePublicCatalogCache,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useCurrency } from "@/store/currency-context";

function ProductsPageContent() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getProductsCopy(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { currency: displayCurrency } = useCurrency();
  const prevDisplayCurrencyRef = useRef(displayCurrency);

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") ?? ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState(
    () => searchParams.get("category") ?? "all"
  );
  const [selectedVendor, setSelectedVendor] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<ProductSortBy>("featured");
  const [vendorProducts, setVendorProducts] = useState<PublicCatalogProduct[]>([]);
  const [apiCategories, setApiCategories] = useState<
    Array<{ id: string; name: string; slug: string; parentId: string | null }>
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const internalCategoryUpdate = useRef(false);
  const internalSearchUpdate = useRef(false);
  const productsLayoutRef = useRef<HTMLDivElement>(null);
  const scrollAnchorTopRef = useRef<number | null>(null);

  useEffect(() => {
    if (internalSearchUpdate.current) {
      internalSearchUpdate.current = false;
      return;
    }
    const nextSearch = searchParams.get("search") ?? "";
    const nextCategory = searchParams.get("category") ?? "all";
    setSearchQuery(nextSearch);
    setDebouncedSearch(nextSearch);
    if (!internalCategoryUpdate.current) {
      setSelectedCategory(nextCategory);
    }
    internalCategoryUpdate.current = false;
  }, [searchParams]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearch("");
    invalidatePublicCatalogCache();
    internalSearchUpdate.current = true;
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (!value.trim()) {
        clearSearch();
      }
    },
    [clearSearch]
  );

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    const current = searchParams.get("search") ?? "";
    if (trimmed === current) return;

    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }

    const qs = params.toString();
    internalSearchUpdate.current = true;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedSearch, pathname, router, searchParams]);

  useEffect(() => {
    const trimmedCategory = selectedCategory === "all" ? "" : selectedCategory;
    const current = searchParams.get("category") ?? "";
    if (trimmedCategory === current) return;

    const params = new URLSearchParams(searchParams.toString());
    if (trimmedCategory) {
      params.set("category", trimmedCategory);
    } else {
      params.delete("category");
    }

    const qs = params.toString();
    internalCategoryUpdate.current = true;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedCategory, pathname, router, searchParams]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setCatalogLoading(true);
      try {
        const trimmedSearch = debouncedSearch.trim();
        const categoryFilter =
          selectedCategory !== "all" ? selectedCategory : undefined;
        const [products, categoriesRes] = await Promise.all([
          fetchPublicCatalogProducts(
            trimmedSearch || categoryFilter
              ? { search: trimmedSearch || undefined, category: categoryFilter }
              : undefined
          ),
          fetch("/api/catalog/categories"),
        ]);
        const categories = categoriesRes.ok
          ? await parseApiResponse<
              Array<{ id: string; name: string; slug: string; parentId: string | null }>
            >(categoriesRes)
          : [];

        if (!mounted) return;

        setVendorProducts(products);
        setApiCategories(categories);
      } catch {
        if (mounted) setVendorProducts([]);
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [debouncedSearch, selectedCategory]);

  const categoryOptions = useMemo<CategoryOption[]>(
    () =>
      apiCategories.map((category) => ({
        id: category.slug,
        label: { en: category.name, ps: category.name, "fa-AF": category.name },
      })),
    [apiCategories]
  );

  const allowedCategorySlugs = useMemo(() => {
    if (selectedCategory === "all") return undefined;
    return collectCategorySlugTree(apiCategories, selectedCategory);
  }, [apiCategories, selectedCategory]);

  useEffect(() => {
    const prices = vendorProducts.map((product) =>
      getCatalogPriceInCurrency(product, displayCurrency)
    );
    const computedMax = Math.ceil(Math.max(100, ...prices, 0));

    setMaxPrice(computedMax);

    if (prevDisplayCurrencyRef.current !== displayCurrency) {
      setPriceRange((current) => {
        const convertedMax = Math.round(
          convertMajorUnits(current[1], prevDisplayCurrencyRef.current, displayCurrency)
        );
        return [0, Math.min(Math.max(0, convertedMax), computedMax)];
      });
      prevDisplayCurrencyRef.current = displayCurrency;
      return;
    }

    setPriceRange((current) => [0, Math.min(current[1], computedMax)]);
  }, [vendorProducts, displayCurrency]);

  const formatPriceLabel = useCallback(
    (amount: number) => formatMajorUnits(amount, displayCurrency, locale),
    [displayCurrency, locale]
  );

  const allProducts = useMemo<CatalogRow[]>(() => vendorProducts, [vendorProducts]);

  const categories = useMemo(() => categoryOptions, [categoryOptions]);

  const vendors = useMemo(() => {
    const names = new Set<string>();
    for (const product of vendorProducts) names.add(product.vendor);
    return Array.from(names);
  }, [vendorProducts]);

  const filteredProducts = useMemo(
    () =>
      filterCatalogProducts(allProducts, {
        searchQuery: debouncedSearch,
        selectedCategory,
        selectedVendor,
        priceRange,
        locale,
        displayCurrency,
        allowedCategorySlugs,
      }),
    [
      allProducts,
      debouncedSearch,
      selectedCategory,
      selectedVendor,
      priceRange,
      locale,
      displayCurrency,
      allowedCategorySlugs,
    ]
  );

  const sortedProducts = useMemo(
    () => sortCatalogProducts(filteredProducts, sortBy, displayCurrency),
    [filteredProducts, sortBy, displayCurrency]
  );

  const handlePriceChange = useCallback((max: number) => {
    if (productsLayoutRef.current) {
      scrollAnchorTopRef.current = productsLayoutRef.current.getBoundingClientRect().top;
    }
    setPriceRange([0, max]);
  }, []);

  useLayoutEffect(() => {
    if (scrollAnchorTopRef.current === null || !productsLayoutRef.current) return;

    const previousTop = scrollAnchorTopRef.current;
    const newTop = productsLayoutRef.current.getBoundingClientRect().top;
    const delta = newTop - previousTop;

    if (delta !== 0) {
      window.scrollBy({ top: delta, left: 0, behavior: "auto" });
    }

    scrollAnchorTopRef.current = null;
  }, [priceRange, sortedProducts.length]);

  const toggleVendor = (vendor: string) => {
    setSelectedVendor((prev) =>
      prev.includes(vendor) ? prev.filter((item) => item !== vendor) : [...prev, vendor]
    );
  };

  const clearFilters = useCallback(() => {
    setSelectedCategory("all");
    setSelectedVendor([]);
    setPriceRange([0, maxPrice]);
    clearSearch();
  }, [maxPrice, clearSearch]);

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedVendor.length > 0 ||
    priceRange[1] < maxPrice ||
    Boolean(debouncedSearch.trim());

  const activeFilterCount = [
    selectedCategory !== "all",
    selectedVendor.length > 0,
    priceRange[1] < maxPrice,
    debouncedSearch.trim(),
  ].filter(Boolean).length;

  const filterLabels = {
    filters: copy.filter,
    category: copy.category,
    price: copy.price,
    brand: copy.brand,
    maxPrice: copy.maxPrice,
    showProducts: copy.showProducts,
    products: copy.products,
  };

  const activeCategoryName =
    selectedCategory !== "all"
      ? apiCategories.find((category) => category.slug === selectedCategory)?.name
      : undefined;

  const headerCopy = debouncedSearch.trim()
    ? {
        ...copy,
        allProducts: copy.searchResults,
        shopSubtitle: copy.searchResultsFor(debouncedSearch.trim()),
      }
    : activeCategoryName
      ? {
          ...copy,
          allProducts: activeCategoryName,
          shopSubtitle: copy.shopSubtitle,
        }
      : copy;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f8fc]">
      <ProductsPageHeader
        isRtl={isRtl}
        copy={headerCopy}
        resultCount={catalogLoading ? 0 : sortedProducts.length}
        hasActiveFilters={hasActiveFilters}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={clearSearch}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <ProductsToolbar
          isRtl={isRtl}
          sortBy={sortBy}
          activeFilterCount={activeFilterCount}
          hasActiveFilters={hasActiveFilters}
          onSortChange={setSortBy}
          onOpenFilters={() => setMobileFiltersOpen(true)}
          onClearFilters={clearFilters}
          labels={copy}
        />

        <div ref={productsLayoutRef} className="flex gap-8">
          <aside className="hidden w-[17.5rem] shrink-0 self-start lg:block">
            <div className="sticky top-24 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,52,96,0.06)]">
              <ProductsFiltersPanel
                locale={locale}
                isRtl={isRtl}
                categories={categories}
                vendors={vendors}
                selectedCategory={selectedCategory}
                selectedVendor={selectedVendor}
                priceRange={priceRange}
                maxPrice={maxPrice}
                onCategoryChange={setSelectedCategory}
                onToggleVendor={toggleVendor}
                onPriceChange={handlePriceChange}
                labels={filterLabels}
                formatPriceLabel={formatPriceLabel}
              />
            </div>
          </aside>

          <ProductsMobileFiltersDrawer
            open={mobileFiltersOpen}
            isRtl={isRtl}
            locale={locale}
            categories={categories}
            vendors={vendors}
            selectedCategory={selectedCategory}
            selectedVendor={selectedVendor}
            priceRange={priceRange}
            maxPrice={maxPrice}
            resultCount={sortedProducts.length}
            onClose={() => setMobileFiltersOpen(false)}
            onCategoryChange={setSelectedCategory}
            onToggleVendor={toggleVendor}
            onPriceChange={handlePriceChange}
            labels={filterLabels}
            formatPriceLabel={formatPriceLabel}
          />

          <section
            className="min-w-0 flex-1 pb-10 [overflow-anchor:none]"
            style={{ overflowAnchor: "none" }}
          >
            {catalogLoading ? (
              <ProductsGridSkeleton />
            ) : sortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5 2xl:grid-cols-4">
                {sortedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    className="min-w-0"
                    initial={false}
                    animate={{ opacity: 1 }}
                  >
                    <ProductCard
                      product={product}
                      locale={locale}
                      priority={index < 4}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <ProductsEmptyState
                title={debouncedSearch.trim() ? copy.noSearchResults : copy.noProducts}
                description={
                  debouncedSearch.trim() ? copy.noSearchResultsHint : copy.noProductsHint
                }
                actionLabel={copy.clearFilters}
                onClearFilters={clearFilters}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f6f8fc]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <ProductsGridSkeleton />
          </div>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
