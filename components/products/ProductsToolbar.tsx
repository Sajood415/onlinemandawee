"use client";

import { ArrowUpDown, SlidersHorizontal, X } from "lucide-react";

import type { ProductSortBy } from "@/components/products/types";

type ProductsToolbarProps = {
  isRtl: boolean;
  sortBy: ProductSortBy;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  onSortChange: (value: ProductSortBy) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  labels: {
    filterShort: string;
    sortFeatured: string;
    sortPriceLow: string;
    sortPriceHigh: string;
    sortRating: string;
    clearAll: string;
  };
};

export function ProductsToolbar({
  isRtl,
  sortBy,
  activeFilterCount,
  hasActiveFilters,
  onSortChange,
  onOpenFilters,
  onClearFilters,
  labels,
}: ProductsToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-[0_8px_30px_rgba(15,52,96,0.05)] sm:p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-semibold text-[#0f3460] transition hover:border-[#0f3460]/20 hover:bg-white lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {labels.filterShort}
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        <div className="relative">
          <ArrowUpDown
            className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 ${
              isRtl ? "right-3" : "left-3"
            }`}
          />
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as ProductSortBy)}
            className={`appearance-none rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-800 outline-none transition hover:border-neutral-300 focus:border-primary focus:ring-2 focus:ring-primary/15 ${
              isRtl ? "pe-10 ps-10" : "ps-10 pe-10"
            }`}
            aria-label="Sort products"
          >
            <option value="featured">{labels.sortFeatured}</option>
            <option value="price-low">{labels.sortPriceLow}</option>
            <option value="price-high">{labels.sortPriceHigh}</option>
            <option value="rating">{labels.sortRating}</option>
          </select>
        </div>
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
        >
          <X className="h-4 w-4" />
          {labels.clearAll}
        </button>
      ) : null}
    </div>
  );
}
