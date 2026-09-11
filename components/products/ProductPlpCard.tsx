"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Loader2, ShoppingCart } from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import {
  getCouponAdjustedPrices,
  getPrimaryProductCoupon,
  ProductCouponImageBadge,
} from "@/components/products/ProductCouponOffer";
import { StarRating } from "@/components/products/StarRating";
import {
  getActiveCatalogVariants,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { toast } from "@/lib/utils/toast";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";

type ProductPlpCardProps = {
  product: PublicCatalogProduct;
  priority?: boolean;
};

export function ProductPlpCard({ product, priority = false }: ProductPlpCardProps) {
  const t = useTranslations("ProductsPages.catalog");
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const primaryCoupon = getPrimaryProductCoupon(product.availableCoupons);
  const prices = getCouponAdjustedPrices(
    product.price,
    product.currency,
    primaryCoupon,
    formatPrice
  );
  const hasVariants = getActiveCatalogVariants(product.variants).length > 1;
  const inStock = product.inStock;

  const handleAdd = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!inStock) return;

    if (hasVariants) {
      router.push(`/products/${product.id}`);
      return;
    }

    setIsAdding(true);
    try {
      await addItem(product.id, 1);
      toast.success(t("addedToCart"));
    } catch {
      toast.error(t("addError"));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_30px_rgba(15,52,96,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_20px_50px_rgba(15,52,96,0.12)]">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-neutral-50">
        <Link href={`/products/${product.id}`} className="absolute inset-0 block">
          <CatalogImage
            src={product.image}
            alt={product.name[locale]}
            fill
            priority={priority}
            className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 280px"
          />
        </Link>
        {primaryCoupon ? <ProductCouponImageBadge coupon={primaryCoupon} /> : null}
        {!inStock ? (
          <span className="absolute start-2 top-2 rounded-full bg-neutral-900/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            {t("soldOut")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="truncate text-[11px] font-medium text-neutral-400">{product.vendor}</p>
        <Link href={`/products/${product.id}`} className="-mt-1 block">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 transition group-hover:text-secondary">
            {product.name[locale]}
          </h3>
        </Link>

        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-bold tracking-tight text-neutral-900">{prices.current}</span>
          {prices.original ? (
            <span className="text-xs text-neutral-400 line-through">{prices.original}</span>
          ) : null}
        </div>

        {product.reviews > 0 ? (
          <StarRating rating={product.rating} reviews={product.reviews} size="sm" />
        ) : null}

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock || isAdding}
          className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none"
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShoppingCart className="h-3.5 w-3.5" />
          )}
          {t("addToCart")}
        </button>
      </div>
    </article>
  );
}
