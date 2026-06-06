"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  sortCatalogProducts,
} from "@/lib/products/catalog-filters";
import {
  fetchPublicCatalogProducts,
  invalidatePublicCatalogCache,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { usePathname, useRouter } from "@/i18n/navigation";
import productData from "@/data/product.json";

const staticProducts = productData.featuredProducts;
const staticCategories = productData.categories;
const staticVendors = productData.vendors;

function ProductsPageContent() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getProductsCopy(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") ?? ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<ProductSortBy>("featured");
  const [vendorProducts, setVendorProducts] = useState<PublicCatalogProduct[]>([]);
  const [apiCategories, setApiCategories] = useState<CategoryOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const internalSearchUpdate = useRef(false);

  useEffect(() => {
    if (internalSearchUpdate.current) {
      internalSearchUpdate.current = false;
      return;
    }
    const next = searchParams.get("search") ?? "";
    setSearchQuery(next);
    setDebouncedSearch(next);
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
    let mounted = true;

    const load = async () => {
      setCatalogLoading(true);
      try {
        const trimmedSearch = debouncedSearch.trim();
        const [products, categoriesRes] = await Promise.all([
          fetchPublicCatalogProducts(
            trimmedSearch ? { search: trimmedSearch } : undefined
          ),
          fetch("/api/catalog/categories"),
        ]);
        const categories = categoriesRes.ok
          ? await parseApiResponse<{ id: string; name: string; slug: string }[]>(
              categoriesRes
            )
          : [];

        if (!mounted) return;

        setVendorProducts(products);
        setApiCategories(
          categories.map((category) => ({
            id: category.slug,
            label: { en: category.name, ps: category.name, "fa-AF": category.name },
          }))
        );

        const prices = [...staticProducts, ...products].map((product) => product.price);
        const computedMax = Math.max(100, ...prices, 0);
        setMaxPrice(computedMax);
        setPriceRange((current) => [current[0], Math.max(current[1], computedMax)]);
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
  }, [debouncedSearch]);

  const allProducts = useMemo<CatalogRow[]>(
    () => [...vendorProducts, ...staticProducts],
    [vendorProducts]
  );

  const categories = useMemo(() => {
    const merged = [...staticCategories];
    for (const category of apiCategories) {
      if (!merged.some((item) => item.id === category.id)) merged.push(category);
    }
    return merged;
  }, [apiCategories]);

  const vendors = useMemo(() => {
    const names = new Set<string>(staticVendors);
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
      }),
    [
      allProducts,
      debouncedSearch,
      selectedCategory,
      selectedVendor,
      priceRange,
      locale,
    ]
  );

  const sortedProducts = useMemo(
    () => sortCatalogProducts(filteredProducts, sortBy),
    [filteredProducts, sortBy]
  );

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

  const headerCopy = debouncedSearch.trim()
    ? {
        ...copy,
        allProducts: copy.searchResults,
        shopSubtitle: copy.searchResultsFor(debouncedSearch.trim()),
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

        <div className="flex gap-8">
          <aside className="hidden w-[17.5rem] shrink-0 lg:block">
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
                onPriceChange={(max) => setPriceRange([0, max])}
                labels={filterLabels}
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
            onPriceChange={(max) => setPriceRange([0, max])}
            labels={filterLabels}
          />

          <section className="min-w-0 flex-1 pb-10">
            {catalogLoading ? (
              <ProductsGridSkeleton />
            ) : sortedProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5 2xl:grid-cols-4">
                {sortedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.24) }}
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
