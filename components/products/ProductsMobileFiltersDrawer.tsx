"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { ProductsFiltersPanel } from "@/components/products/ProductsFiltersPanel";
import type { CategoryOption } from "@/components/products/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type ProductsMobileFiltersDrawerProps = {
  open: boolean;
  isRtl: boolean;
  locale: SupportedLocale;
  categories: CategoryOption[];
  vendors: string[];
  selectedCategory: string;
  selectedVendor: string[];
  priceRange: [number, number];
  maxPrice: number;
  resultCount: number;
  onClose: () => void;
  onCategoryChange: (id: string) => void;
  onToggleVendor: (vendor: string) => void;
  onPriceChange: (max: number) => void;
  labels: {
    filters: string;
    category: string;
    price: string;
    brand: string;
    maxPrice: string;
    showProducts: string;
    products: string;
  };
  formatPriceLabel: (amount: number) => string;
};

export function ProductsMobileFiltersDrawer({
  open,
  isRtl,
  locale,
  categories,
  vendors,
  selectedCategory,
  selectedVendor,
  priceRange,
  maxPrice,
  resultCount,
  onClose,
  onCategoryChange,
  onToggleVendor,
  onPriceChange,
  labels,
  formatPriceLabel,
}: ProductsMobileFiltersDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="Close filters"
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[#0f3460]/40 backdrop-blur-[2px] lg:hidden"
          />
          <motion.aside
            initial={{ x: isRtl ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? "100%" : "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className={`fixed bottom-0 top-0 z-50 flex w-[min(100vw,22rem)] flex-col bg-white shadow-2xl lg:hidden ${
              isRtl ? "right-0" : "left-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <h2 className="text-lg font-bold text-[#0f3460]">{labels.filters}</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:bg-neutral-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <ProductsFiltersPanel
                locale={locale}
                isRtl={isRtl}
                categories={categories}
                vendors={vendors}
                selectedCategory={selectedCategory}
                selectedVendor={selectedVendor}
                priceRange={priceRange}
                maxPrice={maxPrice}
                onCategoryChange={onCategoryChange}
                onToggleVendor={onToggleVendor}
                onPriceChange={onPriceChange}
                labels={labels}
                formatPriceLabel={formatPriceLabel}
              />
            </div>

            <div className="border-t border-neutral-100 bg-white p-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg transition hover:bg-primary/90"
              >
                {labels.showProducts} {resultCount} {labels.products}
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
