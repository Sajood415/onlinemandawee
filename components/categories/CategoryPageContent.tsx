"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import { getCategoryCopy } from "@/components/categories/copy";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductsGridSkeleton } from "@/components/products/ProductsGridSkeleton";
import { Link } from "@/i18n/navigation";
import type { PublicCategoryDetail } from "@/lib/categories/public-category";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { filterCatalogProducts, sortCatalogProducts } from "@/lib/products/catalog-filters";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { useCurrency } from "@/store/currency-context";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";

type CategoryPageContentProps = {
  slug: string;
  locale: SupportedLocale;
  isRtl: boolean;
};

export function CategoryPageContent({ slug, locale, isRtl }: CategoryPageContentProps) {
  const copy = getCategoryCopy(locale);
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProductsGridSkeleton />
      </div>
    );
  }

  if (notFound || !category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[#0f3460]">Category not found</h1>
        <Link href="/products" className="mt-4 inline-block text-primary hover:underline">
          {copy.browseAll}
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
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f8fc]">
      <section className="border-b border-[#0f3460]/10 bg-gradient-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex min-w-0 items-center gap-2 text-sm text-white/70"
          >
            <Link href="/" className="transition hover:text-white hover:underline">
              {copy.home}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <Link href="/products" className="transition hover:text-white hover:underline">
              {copy.allProducts}
            </Link>
            {category.parent ? (
              <>
                <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
                <Link
                  href={`/category/${category.parent.slug}`}
                  className="transition hover:text-white hover:underline"
                >
                  {parentTitle}
                </Link>
              </>
            ) : null}
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="truncate font-medium text-white">{categoryTitle}</span>
          </nav>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{categoryTitle}</h1>
          <p className="mt-2 text-sm text-white/75">{copy.results(filteredProducts.length)}</p>

          <label className="relative mt-6 block max-w-xl">
            <Search
              className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400 ${
                isRtl ? "right-4" : "left-4"
              }`}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className={`h-12 w-full rounded-2xl border border-white/20 bg-white/95 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-white focus:bg-white focus:ring-4 focus:ring-white/25 [&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden ${
                isRtl ? "pe-4 ps-12 text-right" : "ps-12 pe-4 text-left"
              }`}
            />
          </label>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {category.children.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">
              {copy.subcategories}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/category/${child.slug}`}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-50">
                    <Image
                      src={child.image ?? PLACEHOLDER_IMAGE}
                      alt={child.name}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 50vw, 160px"
                    />
                  </div>
                  <span className="text-center text-sm font-semibold text-neutral-800 group-hover:text-primary">
                    {resolveCategoryLabel(child.slug, child.name, locale, child.translations)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5 2xl:grid-cols-4">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  priority={index < 4}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center">
              <p className="text-lg font-semibold text-[#0f3460]">
                {debouncedSearch.trim() ? copy.noSearchResults : copy.noProducts}
              </p>
              <Link
                href="/products"
                className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
              >
                {copy.browseAll}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
