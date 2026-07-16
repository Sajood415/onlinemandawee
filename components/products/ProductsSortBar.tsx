"use client";

import { SlidersHorizontal } from "lucide-react";
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
          className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("filters")}
          {activeFilterCount > 0 ? (
            <span className="bg-[#0F3460] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <span className="hidden sm:inline">{t("sort")}</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as PublicCatalogSort)}
            className="border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-800 outline-none focus:border-[#0F3460]"
          >
            <option value="relevance">{t("sortRelevance")}</option>
            <option value="newest">{t("sortNewest")}</option>
            <option value="price-asc">{t("sortPriceAsc")}</option>
            <option value="price-desc">{t("sortPriceDesc")}</option>
            <option value="rating">{t("sortRating")}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
