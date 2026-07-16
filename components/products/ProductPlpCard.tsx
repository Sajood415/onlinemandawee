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
    <article className="group flex h-full flex-col border border-neutral-200/80 bg-white transition hover:border-[#0F3460]/30">
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-50">
        <Link href={`/products/${product.id}`} className="absolute inset-0 block">
          <CatalogImage
            src={product.image}
            alt={product.name[locale]}
            fill
            priority={priority}
            className="object-contain object-center p-3 transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 280px"
          />
        </Link>
        {primaryCoupon ? <ProductCouponImageBadge coupon={primaryCoupon} /> : null}
        {!inStock ? (
          <span className="absolute start-2 top-2 bg-neutral-900/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {t("soldOut")}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <p className="truncate text-[11px] font-medium text-neutral-400">{product.vendor}</p>
        <Link href={`/products/${product.id}`} className="mt-0.5 block">
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-snug text-neutral-900 transition group-hover:text-[#0F3460]">
            {product.name[locale]}
          </h3>
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-bold text-neutral-900">{prices.current}</span>
          {prices.original ? (
            <span className="text-xs text-neutral-400 line-through">{prices.original}</span>
          ) : null}
        </div>

        {product.reviews > 0 ? (
          <div className="mt-1.5">
            <StarRating rating={product.rating} reviews={product.reviews} size="sm" />
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleAdd}
          disabled={!inStock || isAdding}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 bg-[#ec1b23] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#c4161d] disabled:cursor-not-allowed disabled:bg-neutral-300"
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
