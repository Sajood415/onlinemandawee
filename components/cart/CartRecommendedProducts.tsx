"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/products/ProductCard";
import type { CatalogRow } from "@/components/products/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { getCartCopy } from "@/components/cart/copy";

type CartRecommendedProductsProps = {
  products: CatalogRow[];
  locale: SupportedLocale;
  cartProductIds: string[];
};

export function CartRecommendedProducts({
  products,
  locale,
  cartProductIds,
}: CartRecommendedProductsProps) {
  const copy = getCartCopy();
  const recommendations = products
    .filter((product) => !cartProductIds.includes(product.id))
    .slice(0, 4);

  if (recommendations.length === 0) return null;

  return (
    <section className="mt-12 border-t border-neutral-200/80 pt-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0f3460] sm:text-2xl">
            {copy.recommended}
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Popular picks to complete your order
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:underline"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {recommendations.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </section>
  );
}
