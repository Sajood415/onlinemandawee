"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ProductsFilterSidebar } from "@/components/products/ProductsFilterSidebar";
import type { CatalogFacets } from "@/lib/products/public-catalog";
import type { CatalogUrlState } from "@/lib/products/catalog-url-state";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type DraftFilters = Pick<
  CatalogUrlState,
  "category" | "vendors" | "minPrice" | "maxPrice" | "inStock" | "onSale"
>;

type ProductsMobileFiltersSheetProps = {
  open: boolean;
  onClose: () => void;
  facets: CatalogFacets;
  value: DraftFilters;
  resultCount: number;
  locale: SupportedLocale;
  isRtl: boolean;
  onApply: (next: DraftFilters) => void;
};

export function ProductsMobileFiltersSheet({
  open,
  onClose,
  facets,
  value,
  resultCount,
  locale,
  isRtl,
  onApply,
}: ProductsMobileFiltersSheetProps) {
  const t = useTranslations("ProductsPages.catalog");
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10050] lg:hidden">
      <button
        type="button"
        aria-label={t("closeFilters")}
        className="absolute inset-0 bg-[#0F3460]/40"
        onClick={onClose}
      />
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className={`absolute inset-y-0 flex w-[min(100%,22rem)] flex-col bg-white shadow-xl ${
          isRtl ? "right-0" : "left-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 className="text-base font-bold text-neutral-900">{t("filters")}</h2>
          <button type="button" onClick={onClose} aria-label={t("closeFilters")}>
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <ProductsFilterSidebar
            facets={facets}
            value={draft}
            onChange={setDraft}
            locale={locale}
          />
        </div>
        <div className="border-t border-neutral-200 p-4">
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="w-full bg-[#0F3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
          >
            {t("applyFilters", { count: resultCount })}
          </button>
        </div>
      </div>
    </div>
  );
}
