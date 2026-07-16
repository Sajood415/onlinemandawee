"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Search } from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { ProductPlpCard } from "@/components/products/ProductPlpCard";
import { Link } from "@/i18n/navigation";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import { resolveCategoryShowcaseMedia } from "@/lib/categories/category-showcase-media";
import type { PublicCategoryDetail } from "@/lib/categories/public-category";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import type { PublicCatalogProduct } from "@/lib/products/public-catalog";

type CategoryShowcaseProps = {
  category: PublicCategoryDetail;
  categoryTitle: string;
  parentTitle: string | null;
  locale: SupportedLocale;
  isRtl: boolean;
  products: PublicCatalogProduct[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  hasActiveSearch: boolean;
};

export function CategoryShowcase({
  category,
  categoryTitle,
  parentTitle,
  locale,
  isRtl,
  products,
  searchQuery,
  onSearchChange,
  hasActiveSearch,
}: CategoryShowcaseProps) {
  const t = useTranslations("CategoryPages.showcase");
  const tc = useTranslations("CategoryPages.common");
  const tCommon = useTranslations("Common");
  const isBabyCare = category.slug === "baby-care";

  const media = useMemo(
    () =>
      resolveCategoryShowcaseMedia({
        slug: category.slug,
        categoryImage: category.image,
        children: category.children,
        products,
      }),
    [category.children, category.image, category.slug, products]
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#f2f3f7]">
      <section className="relative w-full min-w-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0F3460]">
          {media.heroSrc ? (
            <CatalogImage
              src={media.heroSrc}
              alt={categoryTitle}
              fill
              className="object-cover object-[center_30%]"
              sizes="100vw"
              priority
            />
          ) : null}
          <div className="absolute inset-0 bg-[#0F3460]/78" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.16),transparent_42%)]"
          />
        </div>

        <div className="relative mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <nav
            aria-label={tCommon("breadcrumb")}
            className="mb-5 flex min-w-0 flex-wrap items-center gap-2 text-sm text-white/70"
          >
            <Link href="/" className="transition hover:text-white hover:underline">
              {tc("home")}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <Link href="/products" className="transition hover:text-white hover:underline">
              {tc("allProducts")}
            </Link>
            {category.parent && parentTitle ? (
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

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
            {t("eyebrow", { category: categoryTitle })}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.5rem]">
            {categoryTitle}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            {isBabyCare ? t("babyCareSubtitle") : t("subtitle")}
          </p>
          <p className="mt-2 text-sm text-white/70">{tc("results", { count: products.length })}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#category-products"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] transition hover:bg-neutral-100"
            >
              {t("shopProducts")}
            </a>
            {isBabyCare ? (
              <Link
                href="/baby-packages"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {t("viewPackages")}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {media.duo.length > 0 ? (
        <section className="w-full min-w-0 py-3 sm:py-4">
          <div className="mx-auto w-full max-w-[1540px] px-2 sm:px-4">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3">
              {media.duo.map((item) => {
                const isHash = item.href.startsWith("#");
                const className =
                  "relative block min-h-[140px] flex-1 overflow-hidden sm:min-h-[180px] lg:min-h-[210px]";
                const mediaNode = (
                  <>
                    <CatalogImage
                      src={item.src}
                      alt={t(item.altKey)}
                      fill
                      className="object-cover object-center transition duration-500 hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#0F3460]/70 via-[#0F3460]/10 to-transparent" />
                    <span className="absolute inset-s-3 bottom-3 text-sm font-semibold text-white sm:inset-s-4 sm:bottom-4 sm:text-base">
                      {isBabyCare && item.href === "/baby-packages"
                        ? t("viewPackages")
                        : t(item.labelKey)}
                    </span>
                  </>
                );

                return isHash ? (
                  <a key={`${item.src}-${item.href}`} href={item.href} className={className}>
                    {mediaNode}
                  </a>
                ) : (
                  <Link key={`${item.src}-${item.href}`} href={item.href} className={className}>
                    {mediaNode}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {media.promos.length > 0 ? (
        <section className="w-full min-w-0 pb-3 sm:pb-4">
          <div className="mx-auto w-full max-w-[1540px] px-2 sm:px-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {media.promos.map((item) => {
                const isHash = item.href.startsWith("#");
                const className = "group relative block aspect-4/3 overflow-hidden sm:aspect-5/3";
                const mediaNode = (
                  <>
                    <CatalogImage
                      src={item.src}
                      alt={t(item.altKey)}
                      fill
                      className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-[#0F3460]/25 transition group-hover:bg-[#0F3460]/15" />
                    <span className="absolute inset-s-2 bottom-2 text-xs font-semibold text-white drop-shadow sm:inset-s-3 sm:bottom-3 sm:text-sm">
                      {t(item.labelKey)}
                    </span>
                  </>
                );

                return isHash ? (
                  <a key={`${item.src}-${item.labelKey}`} href={item.href} className={className}>
                    {mediaNode}
                  </a>
                ) : (
                  <Link key={`${item.src}-${item.labelKey}`} href={item.href} className={className}>
                    {mediaNode}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {category.children.length > 0 ? (
        <section className="w-full border-y border-black/5 bg-white/70">
          <div className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-6 lg:px-8">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {tc("subcategories")}
            </h2>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/category/${child.slug}`}
                  className="text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
                >
                  {resolveCategoryLabel(child.slug, child.name, locale, child.translations)}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="category-products" className="w-full min-w-0 py-6 sm:py-8">
        <div className="mx-auto w-full max-w-[1540px] px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
                {t("catalogTitle", { category: categoryTitle })}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">{t("catalogSubtitle")}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {tc("results", { count: products.length })}
              </p>
            </div>
            <label className="relative block w-full max-w-md">
              <Search
                className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 ${
                  isRtl ? "right-3" : "left-3"
                }`}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={tc("searchPlaceholder")}
                className={`h-11 w-full border border-neutral-200 bg-white text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/15 [&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden ${
                  isRtl ? "pe-3 ps-10 text-right" : "ps-10 pe-3 text-left"
                }`}
              />
            </label>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
              {products.map((product, index) => (
                <ProductPlpCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
          ) : (
            <div className="border-t border-neutral-200 px-2 py-14 text-center">
              <p className="text-lg font-semibold text-[#0F3460]">
                {hasActiveSearch ? tc("noSearchResults") : tc("noProducts")}
              </p>
              <Link
                href="/products"
                className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
              >
                {tc("browseAll")}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
