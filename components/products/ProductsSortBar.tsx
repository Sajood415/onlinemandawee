"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PublicCatalogSort } from "@/lib/products/public-catalog";

type ProductsSortBarProps = {
  sort: PublicCatalogSort;
  onSortChange: (sort: PublicCatalogSort) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  showingLabel: string;
};

export function ProductsSortBar({
  sort,
  onSortChange,
  activeFilterCount,
  onOpenFilters,
  showingLabel,
}: ProductsSortBarProps) {
  const t = useTranslations("ProductsPages.catalog");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
      <p className="text-sm text-neutral-500">{showingLabel}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("filters")}
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <span className="hidden sm:inline">{t("sort")}</span>
          <span className="relative inline-flex items-center">
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as PublicCatalogSort)}
              className="appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-neutral-800 outline-none transition hover:border-neutral-300 focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
            >
              <option value="relevance">{t("sortRelevance")}</option>
              <option value="newest">{t("sortNewest")}</option>
              <option value="price-asc">{t("sortPriceAsc")}</option>
              <option value="price-desc">{t("sortPriceDesc")}</option>
              <option value="rating">{t("sortRating")}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-neutral-400" />
          </span>
        </label>
      </div>
    </div>
  );
}

