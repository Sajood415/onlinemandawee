"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProductPlpCard } from "@/components/products/ProductPlpCard";
import type { CatalogRow } from "@/components/products/types";
import { Link } from "@/i18n/navigation";
import { useCartCopy } from "@/lib/i18n/use-cart-copy";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import type { PublicCatalogProduct } from "@/lib/products/public-catalog";

type CartRecommendedProductsProps = {
  products: CatalogRow[];
  locale: SupportedLocale;
  cartProductIds: string[];
};

function asPublicProduct(product: CatalogRow): product is PublicCatalogProduct {
  return "name" in product && typeof product.name === "object" && product.name !== null;
}

export function CartRecommendedProducts({
  products,
  locale: _locale,
  cartProductIds,
}: CartRecommendedProductsProps) {
  const copy = useCartCopy();
  const t = useTranslations("Cart");
  const recommendations = products
    .filter((product) => !cartProductIds.includes(product.id))
    .filter(asPublicProduct)
    .slice(0, 4);

  if (recommendations.length === 0) return null;

  return (
    <section className="mt-14 border-t border-neutral-200 pt-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">{copy.recommended}</h2>
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 transition hover:text-[#0F3460]"
        >
          {t("viewAll")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {recommendations.map((product, index) => (
          <ProductPlpCard key={product.id} product={product} priority={index < 2} />
        ))}
      </div>
    </section>
  );
}
