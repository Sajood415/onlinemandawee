"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { CategoryShowcase } from "@/components/categories/CategoryShowcase";
import { ProductsGridSkeleton } from "@/components/products/ProductsGridSkeleton";
import { Link } from "@/i18n/navigation";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import type { PublicCategoryDetail } from "@/lib/categories/public-category";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { filterCatalogProducts, sortCatalogProducts } from "@/lib/products/catalog-filters";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { useCurrency } from "@/store/currency-context";

type CategoryPageContentProps = {
  slug: string;
  locale: SupportedLocale;
  isRtl: boolean;
};

export function CategoryPageContent({ slug, locale, isRtl }: CategoryPageContentProps) {
  const t = useTranslations("CategoryPages.common");
  const { currency: displayCurrency } = useCurrency();
  const [category, setCategory] = useState<PublicCategoryDetail | null>(null);
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      setSearchQuery("");
      setDebouncedSearch("");

      try {
        const categoryRes = await fetch(`/api/catalog/categories/${encodeURIComponent(slug)}`);
        if (!categoryRes.ok) {
          if (mounted) setNotFound(true);
          return;
        }

        const categoryData = (await categoryRes.json()).data as PublicCategoryDetail;
        const catalogProducts = await fetchPublicCatalogProducts({ category: slug });

        if (!mounted) return;
        setCategory(categoryData);
        setProducts(catalogProducts);
      } catch {
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const filteredProducts = useMemo(() => {
    const filtered = filterCatalogProducts(products, {
      searchQuery: debouncedSearch,
      selectedCategory: "all",
      selectedVendor: [],
      priceRange: [0, Number.MAX_SAFE_INTEGER],
      locale,
      displayCurrency,
    });
    return sortCatalogProducts(filtered, "featured", displayCurrency);
  }, [products, debouncedSearch, locale, displayCurrency]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#f2f3f7]">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 lg:px-8">
          <ProductsGridSkeleton />
        </div>
      </div>
    );
  }

  if (notFound || !category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[#0F3460]">{t("notFound")}</h1>
        <Link href="/products" className="mt-4 inline-block text-primary hover:underline">
          {t("browseAll")}
        </Link>
      </div>
    );
  }

  const categoryTitle = resolveCategoryLabel(
    category.slug,
    category.name,
    locale,
    category.translations
  );
  const parentTitle = category.parent
    ? resolveCategoryLabel(
        category.parent.slug,
        category.parent.name,
        locale,
        category.parent.translations
      )
    : null;

  return (
    <CategoryShowcase
      category={category}
      categoryTitle={categoryTitle}
      parentTitle={parentTitle}
      locale={locale}
      isRtl={isRtl}
      products={filteredProducts}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      hasActiveSearch={Boolean(debouncedSearch.trim())}
    />
  );
}
