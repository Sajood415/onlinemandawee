"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Loader2, ShoppingBag } from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { StarRating } from "@/components/products/StarRating";
import type { CatalogRow } from "@/components/products/types";
import { getProductsCopy } from "@/components/products/copy";
import {
  localizeDelivery,
  localizeVendor,
  type SupportedLocale,
} from "@/lib/localization/product-vendor";
import { toast } from "@/lib/utils/toast";
import { useCart } from "@/store/cart-context";

type ProductCardProps = {
  product: CatalogRow;
  locale: SupportedLocale;
  priority?: boolean;
};

function formatPrice(product: CatalogRow) {
  if ("priceDisplay" in product && product.priceDisplay) {
    return product.priceDisplay;
  }
  return `$${product.price.toFixed(2)}`;
}

export function ProductCard({ product, locale, priority = false }: ProductCardProps) {
  const copy = getProductsCopy(locale);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsAdding(true);
    try {
      await addItem(product.id, 1);
      toast.success(copy.addedToCart);
    } catch {
      toast.error(copy.addToCartFailed);
    } finally {
      setIsAdding(false);
    }
  };

  const compareAt =
    product.price > 50 ? (product.price * 1.15).toFixed(2) : null;

  return (
    <article className="group flex h-full flex-col">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_30px_rgba(15,52,96,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_20px_50px_rgba(15,52,96,0.12)]">
        <Link
          href={`/products/${product.id}`}
          className="relative block aspect-[4/5] overflow-hidden bg-gradient-to-b from-neutral-50 to-white"
        >
          <CatalogImage
            src={product.image}
            alt={product.name[locale]}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f3460]/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {product.badge ? (
            <div className="absolute left-3 top-3 z-10">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
                  product.badge.en === "Best Seller"
                    ? "bg-primary text-white"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {product.badge[locale]}
              </span>
            </div>
          ) : null}

          <button
            type="button"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isWishlisted}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsWishlisted((value) => !value);
            }}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/95 text-neutral-600 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:text-primary"
          >
            <Heart
              className={`h-4 w-4 ${isWishlisted ? "fill-primary text-primary" : ""}`}
            />
          </button>

          <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-100 transition-all duration-300 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90 disabled:opacity-60"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              {copy.addToCart}
            </button>
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-4">
          <Link
            href={`/vendors/${product.vendorSlug}`}
            className="mb-1.5 inline-flex w-fit text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f3460]/70 transition hover:text-primary"
          >
            <bdi dir="ltr">{localizeVendor(product.vendor, locale)}</bdi>
          </Link>

          <Link href={`/products/${product.id}`} className="block flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-[#0f3460]">
              {product.name[locale]}
            </h3>
          </Link>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold tracking-tight text-[#0f3460]">
                  {formatPrice(product)}
                </span>
                {compareAt ? (
                  <span className="text-xs text-neutral-400 line-through">
                    ${compareAt}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] font-medium text-emerald-600">
                {localizeDelivery(product.delivery, locale)}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-neutral-100 pt-3">
            <StarRating rating={product.rating} reviews={product.reviews} />
          </div>
        </div>
      </div>
    </article>
  );
}
