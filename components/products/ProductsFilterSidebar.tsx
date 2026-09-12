"use client";

import { Check, ChevronDown, SlidersHorizontal, Store, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { CatalogFacets } from "@/lib/products/public-catalog";
import type { CatalogUrlState } from "@/lib/products/catalog-url-state";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type DraftFilters = Pick<
  CatalogUrlState,
  "category" | "vendors" | "minPrice" | "maxPrice" | "inStock" | "onSale"
>;

type ProductsFilterSidebarProps = {
  facets: CatalogFacets;
  value: DraftFilters;
  onChange: (next: DraftFilters) => void;
  locale: SupportedLocale;
  categoryTranslations?: Record<string, unknown>;
};

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
        checked
          ? "border-secondary bg-secondary text-white"
          : "border-neutral-300 bg-white group-hover:border-secondary/50"
      }`}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
}

function Accordion({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-neutral-100 py-4 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded text-start text-sm font-bold text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
      >
        <span className="flex items-center gap-2">
          {icon ? <span className="text-secondary/60">{icon}</span> : null}
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-3.5 space-y-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ProductsFilterSidebar({
  facets,
  value,
  onChange,
  locale,
}: ProductsFilterSidebarProps) {
  const t = useTranslations("ProductsPages.catalog");

  const toggleVendor = (slug: string) => {
    const exists = value.vendors.includes(slug);
    onChange({
      ...value,
      vendors: exists
        ? value.vendors.filter((entry) => entry !== slug)
        : [...value.vendors, slug],
    });
  };

  const priceFloor = Math.floor(facets.priceMin);
  const priceCeil = Math.ceil(facets.priceMax || 1000);

  const activeCount =
    value.vendors.length +
    (value.minPrice != null ? 1 : 0) +
    (value.maxPrice != null ? 1 : 0) +
    (value.inStock ? 1 : 0) +
    (value.onSale ? 1 : 0);

  const clearAll = () =>
    onChange({
      category: value.category,
      vendors: [],
      minPrice: null,
      maxPrice: null,
      inStock: false,
      onSale: false,
    });

  return (
    <aside className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_30px_rgba(15,52,96,0.06)]">
      <div className="flex items-center justify-between gap-2 bg-secondary/5 px-4 py-3.5">
        <span className="flex items-center gap-2 text-sm font-bold text-neutral-900">
          <SlidersHorizontal className="h-4 w-4 text-secondary" />
          {t("filters")}
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </span>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 rounded text-xs font-semibold text-neutral-500 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            <X className="h-3.5 w-3.5" />
            {t("clearAll")}
          </button>
        ) : null}
      </div>

      <div className="px-4 py-1">
      <Accordion title={t("price")} icon={<Wallet className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block text-xs font-medium text-neutral-500">
            {t("minPrice")}
            <input
              type="number"
              min={0}
              placeholder={String(priceFloor)}
              value={value.minPrice ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  minPrice:
                    event.target.value === "" ? null : Math.max(0, Number(event.target.value)),
                })
              }
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-800 outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15"
            />
          </label>
          <label className="block text-xs font-medium text-neutral-500">
            {t("maxPrice")}
            <input
              type="number"
              min={0}
              placeholder={String(priceCeil)}
              value={value.maxPrice ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  maxPrice:
                    event.target.value === "" ? null : Math.max(0, Number(event.target.value)),
                })
              }
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm text-neutral-800 outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15"
            />
          </label>
        </div>
      </Accordion>

      <Accordion title={t("vendors")} icon={<Store className="h-4 w-4" />} defaultOpen={false}>
        {facets.vendors.length === 0 ? (
          <p className="text-sm text-neutral-400">—</p>
        ) : (
          facets.vendors.map((vendor) => {
            const checked = value.vendors.includes(vendor.storeSlug);
            return (
              <label
                key={vendor.storeSlug}
                className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVendor(vendor.storeSlug)}
                    className="sr-only"
                  />
                  <Checkbox checked={checked} />
                  <span className="truncate">{vendor.storeName}</span>
                </span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[11px] text-neutral-500">
                  {vendor.count}
                </span>
              </label>
            );
          })
        )}
      </Accordion>

      <Accordion title={t("filters")} defaultOpen>
        <label className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50">
          <span className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={value.inStock}
              onChange={(event) => onChange({ ...value, inStock: event.target.checked })}
              className="sr-only"
            />
            <Checkbox checked={value.inStock} />
            {t("inStock")}
          </span>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[11px] text-neutral-500">
            {facets.inStockCount}
          </span>
        </label>
        <label className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50">
          <span className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={value.onSale}
              onChange={(event) => onChange({ ...value, onSale: event.target.checked })}
              className="sr-only"
            />
            <Checkbox checked={value.onSale} />
            {t("onSale")}
          </span>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[11px] text-neutral-500">
            {facets.onSaleCount}
          </span>
        </label>
      </Accordion>
      </div>
    </aside>
  );
}
