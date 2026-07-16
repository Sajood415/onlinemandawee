"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Search, Sparkles, X } from "lucide-react";

type ProductsPageHeaderProps = {
  isRtl: boolean;
  copy: {
    home: string;
    allProducts: string;
    shopSubtitle: string;
    results: string;
    withFilters: string;
    searchPlaceholder: string;
  };
  resultCount: number;
  hasActiveFilters: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
};

export function ProductsPageHeader({
  isRtl,
  copy,
  resultCount,
  hasActiveFilters,
  searchQuery,
  onSearchChange,
  onClearSearch,
}: ProductsPageHeaderProps) {
  const tCommon = useTranslations("Common");
  const tCatalog = useTranslations("ProductsPages.catalog");

  return (
    <section className="relative overflow-hidden border-b border-[#0f3460]/10 bg-gradient-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <nav
          aria-label={tCommon("breadcrumb")}
          className="mb-5 flex min-w-0 items-center gap-2 overflow-hidden text-sm text-white/70"
        >
          <Link href="/" className="transition hover:text-white hover:underline">
            {copy.home}
          </Link>
          <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
          <span className="truncate font-medium text-white">{copy.allProducts}</span>
        </nav>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Premium marketplace
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
              {copy.allProducts}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
              {copy.shopSubtitle}
            </p>
            <p className="mt-4 text-sm text-white/80">
              <span className="font-semibold text-white">{resultCount}</span> {copy.results}
              {hasActiveFilters ? ` ${copy.withFilters}` : ""}
            </p>
          </div>

          <div className="w-full lg:max-w-md">
            <label className="relative block">
              <span className="sr-only">{copy.searchPlaceholder}</span>
              <Search
                className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400 ${
                  isRtl ? "right-4" : "left-4"
                }`}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className={`h-12 w-full rounded-2xl border border-white/20 bg-white/95 text-sm font-medium text-neutral-900 shadow-[0_12px_40px_rgba(15,52,96,0.18)] outline-none transition placeholder:text-neutral-400 focus:border-white focus:bg-white focus:ring-4 focus:ring-white/25 [&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden ${
                  isRtl ? "pe-11 ps-12 text-right" : "ps-12 pe-11 text-left"
                }`}
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label={tCatalog("clearFilters")}
                  onClick={onClearSearch}
                  className={`absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 ${
                    isRtl ? "left-2" : "right-2"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
