"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/products/ProductCard";
import { getProductsCopy } from "@/components/products/copy";
import type { CatalogRow } from "@/components/products/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type RelatedProductsProps = {
  products: CatalogRow[];
  locale: SupportedLocale;
  categorySlug: string;
  categoryLabel?: string;
};

export function RelatedProducts({
  products,
  locale,
  categorySlug,
  categoryLabel,
}: RelatedProductsProps) {
  const copy = getProductsCopy(locale);
  const isRtl = locale !== "en";

  if (products.length === 0) return null;

  const label = categoryLabel ?? categorySlug;

  return (
    <section className="border-t border-neutral-200/80 pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0f3460] sm:text-2xl">
            {copy.relatedTitle}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            {copy.relatedSubtitle(label)}
          </p>
        </div>
        <Link
          href={`/category/${categorySlug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:underline"
        >
          {copy.viewCategory}
          <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </section>
  );
}
