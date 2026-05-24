import type { CategoryOption } from "@/components/products/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { localizeVendor } from "@/lib/localization/product-vendor";
import { Check, SlidersHorizontal } from "lucide-react";

type ProductsFiltersPanelProps = {
  locale: SupportedLocale;
  isRtl: boolean;
  categories: CategoryOption[];
  vendors: string[];
  selectedCategory: string;
  selectedVendor: string[];
  priceRange: [number, number];
  maxPrice: number;
  onCategoryChange: (id: string) => void;
  onToggleVendor: (vendor: string) => void;
  onPriceChange: (max: number) => void;
  labels: {
    filters: string;
    category: string;
    price: string;
    brand: string;
    maxPrice: string;
  };
  className?: string;
};

export function ProductsFiltersPanel({
  locale,
  isRtl,
  categories,
  vendors,
  selectedCategory,
  selectedVendor,
  priceRange,
  maxPrice,
  onCategoryChange,
  onToggleVendor,
  onPriceChange,
  labels,
  className = "",
}: ProductsFiltersPanelProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f3460]/10 text-[#0f3460]">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-bold tracking-tight text-[#0f3460]">
          {labels.filters}
        </h2>
      </div>

      <section>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          {labels.category}
        </h3>
        <div className="space-y-1.5">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all ${
                  isRtl ? "text-right" : "text-left"
                } ${
                  active
                    ? "bg-[#0f3460] font-semibold text-white shadow-sm"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <span>{cat.label[locale]}</span>
                {active ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-t border-neutral-100 pt-6">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          {labels.price}
        </h3>
        <div className="rounded-xl bg-neutral-50 p-4">
          <input
            type="range"
            min={0}
            max={maxPrice}
            value={priceRange[1]}
            onChange={(event) => onPriceChange(parseInt(event.target.value, 10))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-primary"
            aria-label={labels.price}
          />
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-600">$0</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0f3460] shadow-sm">
              {labels.maxPrice} ${priceRange[1]}
            </span>
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-100 pt-6">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          {labels.brand}
        </h3>
        <div className="max-h-56 space-y-2 overflow-y-auto pe-1">
          {vendors.slice(1).map((vendor) => {
            const checked = selectedVendor.includes(vendor);
            return (
              <label
                key={vendor}
                className="group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-neutral-50"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    checked
                      ? "border-primary bg-primary"
                      : "border-neutral-300 bg-white group-hover:border-neutral-400"
                  }`}
                >
                  {checked ? <Check className="h-3 w-3 text-white" /> : null}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleVendor(vendor)}
                  className="sr-only"
                />
                <span
                  className={`text-sm ${
                    checked ? "font-semibold text-neutral-900" : "text-neutral-600"
                  }`}
                >
                  <bdi dir="ltr">{localizeVendor(vendor, locale)}</bdi>
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
