"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { CatalogFacets } from "@/lib/products/public-catalog";
import type { CatalogUrlState } from "@/lib/products/catalog-url-state";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
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

function Accordion({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-neutral-200 py-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-start text-sm font-bold text-neutral-900"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-neutral-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="mt-3 space-y-2">{children}</div> : null}
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

  return (
    <aside className="border border-neutral-200/80 bg-white px-4 py-2">
      <Accordion title={t("categories")}>
        <button
          type="button"
          onClick={() => onChange({ ...value, category: "" })}
          className={`block w-full px-1 py-1.5 text-start text-sm ${
            !value.category
              ? "font-semibold text-[#0F3460]"
              : "text-neutral-600 hover:text-[#0F3460]"
          }`}
        >
          {t("allCategories")}
        </button>
        {facets.categories.map((category) => {
          const label = resolveCategoryLabel(category.slug, category.name, locale);
          const selected = value.category === category.slug;
          return (
            <div key={category.id}>
              <button
                type="button"
                onClick={() => onChange({ ...value, category: category.slug })}
                className={`flex w-full items-center justify-between gap-2 px-1 py-1.5 text-start text-sm ${
                  selected
                    ? "font-semibold text-[#0F3460]"
                    : "text-neutral-600 hover:text-[#0F3460]"
                }`}
              >
                <span>{label}</span>
                <span className="text-xs text-neutral-400">{category.count}</span>
              </button>
              {category.children.length > 0 ? (
                <div className="ms-3 space-y-1 border-s border-neutral-100 ps-2">
                  {category.children.map((child) => {
                    const childLabel = resolveCategoryLabel(child.slug, child.name, locale);
                    const childSelected = value.category === child.slug;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => onChange({ ...value, category: child.slug })}
                        className={`flex w-full items-center justify-between gap-2 py-1 text-start text-sm ${
                          childSelected
                            ? "font-semibold text-[#0F3460]"
                            : "text-neutral-500 hover:text-[#0F3460]"
                        }`}
                      >
                        <span>{childLabel}</span>
                        <span className="text-xs text-neutral-400">{child.count}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </Accordion>

      <Accordion title={t("price")}>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-neutral-500">
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
              className="mt-1 w-full border-b border-neutral-300 bg-transparent py-1.5 text-sm outline-none focus:border-[#0F3460]"
            />
          </label>
          <label className="text-xs text-neutral-500">
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
              className="mt-1 w-full border-b border-neutral-300 bg-transparent py-1.5 text-sm outline-none focus:border-[#0F3460]"
            />
          </label>
        </div>
      </Accordion>

      <Accordion title={t("vendors")} defaultOpen={false}>
        {facets.vendors.length === 0 ? (
          <p className="text-sm text-neutral-400">—</p>
        ) : (
          facets.vendors.map((vendor) => {
            const checked = value.vendors.includes(vendor.storeSlug);
            return (
              <label
                key={vendor.storeSlug}
                className="flex cursor-pointer items-center justify-between gap-2 px-1 py-1.5 text-sm text-neutral-700"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVendor(vendor.storeSlug)}
                    className="accent-[#0F3460]"
                  />
                  <span className="truncate">{vendor.storeName}</span>
                </span>
                <span className="text-xs text-neutral-400">{vendor.count}</span>
              </label>
            );
          })
        )}
      </Accordion>

      <Accordion title={t("filters")} defaultOpen>
        <label className="flex cursor-pointer items-center justify-between gap-2 px-1 py-1.5 text-sm text-neutral-700">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.inStock}
              onChange={(event) => onChange({ ...value, inStock: event.target.checked })}
              className="accent-[#0F3460]"
            />
            {t("inStock")}
          </span>
          <span className="text-xs text-neutral-400">{facets.inStockCount}</span>
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-2 px-1 py-1.5 text-sm text-neutral-700">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.onSale}
              onChange={(event) => onChange({ ...value, onSale: event.target.checked })}
              className="accent-[#0F3460]"
            />
            {t("onSale")}
          </span>
          <span className="text-xs text-neutral-400">{facets.onSaleCount}</span>
        </label>
      </Accordion>
    </aside>
  );
}
