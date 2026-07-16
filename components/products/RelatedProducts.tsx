"use client";

import { ArrowRight } from "lucide-react";

import { ProductPlpCard } from "@/components/products/ProductPlpCard";
import { getProductsCopy } from "@/components/products/copy";
import type { CatalogRow } from "@/components/products/types";
import { Link } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import type { PublicCatalogProduct } from "@/lib/products/public-catalog";

type RelatedProductsProps = {
  products: CatalogRow[];
  locale: SupportedLocale;
  categorySlug: string;
  categoryLabel?: string;
};

function asPublicProduct(product: CatalogRow): product is PublicCatalogProduct {
  return "name" in product && typeof product.name === "object" && product.name !== null;
}

export function RelatedProducts({
  products,
  locale,
  categorySlug,
  categoryLabel,
}: RelatedProductsProps) {
  const copy = getProductsCopy(locale);
  const isRtl = locale !== "en";
  const items = products.filter(asPublicProduct).slice(0, 8);

  if (items.length === 0) return null;

  const label = categoryLabel ?? categorySlug;

  return (
    <section className="border-t border-neutral-200 pt-10">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            {copy.relatedTitle}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">{copy.relatedSubtitle(label)}</p>
        </div>
        <Link
          href={`/category/${categorySlug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-[#0F3460]"
        >
          {copy.viewCategory}
          <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 xl:gap-4">
        {items.map((product, index) => (
          <ProductPlpCard key={product.id} product={product} priority={index < 2} />
        ))}
      </div>
    </section>
  );
}
