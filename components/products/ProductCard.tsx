"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Loader2, ShoppingBag, Truck } from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { QuantitySelector } from "@/components/cart/QuantitySelector";
import {
  getPrimaryProductCoupon,
  ProductCouponImageBadge,
  ProductCouponPriceHint,
} from "@/components/products/ProductCouponOffer";
import { StarRating } from "@/components/products/StarRating";
import { getProductsCopy } from "@/components/products/copy";
import type { CatalogRow } from "@/components/products/types";
import {
  getActiveCatalogVariants,
  resolveDefaultCatalogVariant,
} from "@/lib/products/public-catalog";
import { resolveAvailableStockQty } from "@/lib/products/product-stock";
import {
  localizeDelivery,
  localizeVendor,
  type SupportedLocale,
} from "@/lib/localization/product-vendor";
import { toast } from "@/lib/utils/toast";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";

type ProductCardProps = {
  product: CatalogRow;
  locale: SupportedLocale;
  priority?: boolean;
};

export function ProductCard({ product, locale, priority = false }: ProductCardProps) {
  const copy = getProductsCopy(locale);
  const activeVariants = getActiveCatalogVariants("variants" in product ? product.variants : undefined);
  const hasVariants = activeVariants.length > 1;
  const defaultVariant =
    activeVariants.length === 1 ? activeVariants[0] : resolveDefaultCatalogVariant(
      "variants" in product ? product.variants : undefined
    );
  const inStock = "inStock" in product ? product.inStock : true;
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const productCurrency =
    "currency" in product && product.currency ? product.currency : "USD";
  const priceLabel = formatPrice(product.price, productCurrency);
  const description =
    "description" in product && product.description
      ? product.description[locale]
      : "";
  const primaryCoupon = getPrimaryProductCoupon(
    "availableCoupons" in product ? product.availableCoupons : undefined
  );

  const handleAddToCart = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!inStock) return;
    setIsAdding(true);
    try {
      await addItem(
        product.id,
        quantity,
        defaultVariant
          ? { variantId: defaultVariant.id, variantName: defaultVariant.name }
          : undefined
      );
      toast.success(copy.addedToCart);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.addToCartFailed);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="group flex h-full min-w-0 flex-col">
      <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_30px_rgba(15,52,96,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_20px_50px_rgba(15,52,96,0.12)]">
        <Link
          href={`/products/${product.id}`}
          className="relative block aspect-[4/5] shrink-0 overflow-hidden bg-gradient-to-b from-neutral-50 to-white"
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
                    : product.badge.en === "Sold Out"
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {product.badge[locale]}
              </span>
            </div>
          ) : null}

          {primaryCoupon ? <ProductCouponImageBadge coupon={primaryCoupon} /> : null}

          <button
            type="button"
            aria-label={isWishlisted ? copy.removeFromWishlist : copy.addToWishlist}
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
        </Link>

        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
          <Link
            href={`/vendors/${product.vendorSlug}`}
            className="mb-1.5 inline-flex w-fit text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f3460]/70 transition hover:text-primary"
          >
            <bdi dir="ltr">{localizeVendor(product.vendor, locale)}</bdi>
          </Link>

          <Link href={`/products/${product.id}`} className="block">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-[#0f3460]">
              {product.name[locale]}
            </h3>
          </Link>

          {description ? (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-500">
              {description}
            </p>
          ) : null}

          <div className="mt-3 min-w-0">
            <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2 sm:gap-y-0.5">
              <span className="text-base font-bold tracking-tight text-[#0f3460] sm:text-lg">
                {priceLabel}
              </span>
            </div>
            {primaryCoupon ? (
              <ProductCouponPriceHint coupon={primaryCoupon} locale={locale} />
            ) : null}
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <Truck className="h-3 w-3 shrink-0" />
              {localizeDelivery(product.delivery, locale)}
            </p>
          </div>

          <div className="mt-3 border-t border-neutral-100 pt-3">
            {product.reviews > 0 ? (
              <StarRating rating={product.rating} reviews={product.reviews} />
            ) : (
              <span className="text-xs text-neutral-400">{copy.noReviews}</span>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-4">
            {!hasVariants ? (
              <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <span className="shrink-0 text-xs font-semibold text-neutral-600">
                  {copy.quantity}
                </span>
                <div className="flex min-w-0 w-full justify-center lg:w-auto lg:justify-end">
                  <QuantitySelector
                    compact
                    quantity={quantity}
                    onDecrease={() => setQuantity((value) => Math.max(1, value - 1))}
                    onIncrease={() =>
                      setQuantity((value) => {
                        const maxQty = resolveAvailableStockQty(
                          {
                            stockQty: product.stockQty,
                            variants: "variants" in product ? product.variants : undefined,
                          },
                          defaultVariant?.id
                        );
                        return Math.min(maxQty, value + 1);
                      })
                    }
                    disabled={isAdding || !inStock}
                  />
                </div>
              </div>
            ) : null}
            {hasVariants && inStock ? (
              <Link
                href={`/products/${product.id}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90"
              >
                <ShoppingBag className="h-4 w-4" />
                {copy.chooseOptions}
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding || !inStock}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
                {!inStock ? copy.soldOut : copy.addToCart}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
