"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { StarRating } from "@/components/products/StarRating";
import {
  getCouponAdjustedPrices,
  getPrimaryProductCoupon,
  ProductCouponImageBadge,
} from "@/components/products/ProductCouponOffer";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { toast } from "@/lib/utils/toast";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";
import { useWishlist } from "@/store/wishlist-context";
import { HomeSectionHeader } from "./HomeSectionHeader";

type LocaleKey = "en" | "ps" | "fa-AF";

type Row = {
  id: string;
  slug: string;
  price: number;
  image: string;
  name: Record<LocaleKey, string>;
  rating: number;
  reviews: number;
  currency: string;
  inStock?: boolean;
  availableCoupons?: PublicCatalogProduct["availableCoupons"];
};

export function toHomeRailRow(product: PublicCatalogProduct): Row {
  return {
    id: product.id,
    slug: product.slug,
    price: product.price,
    image: product.image,
    name: product.name,
    rating: product.rating,
    reviews: product.reviews,
    currency: product.currency,
    inStock: product.inStock,
    availableCoupons: product.availableCoupons,
  };
}

export function HomeRailProductCard({ product, locale }: { product: Row; locale: LocaleKey }) {
  const t = useTranslations("Homepage.store");
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const wishlisted = isInWishlist(product.id);
  const primaryCoupon = getPrimaryProductCoupon(product.availableCoupons);
  const prices = getCouponAdjustedPrices(
    product.price,
    product.currency,
    primaryCoupon,
    formatPrice
  );

  const handleAddToCart = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
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

  const handleWishlist = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (wishlisted) {
      removeFromWishlist(product.id);
      return;
    }
    addToWishlist({
      id: product.id,
      name: product.name[locale],
      price: product.price,
      priceDisplay: prices.current,
      vendor: "",
      image: product.image,
    });
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_30px_rgba(15,52,96,0.06)] transition hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_20px_50px_rgba(15,52,96,0.12)]">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-[#F7F4EF]">
        <Link
          href={`/products/${product.id}`}
          className="absolute inset-0 z-0 block outline-none"
        >
          <CatalogImage
            src={product.image}
            alt={product.name[locale]}
            fill
            className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 42vw, 220px"
          />
        </Link>

        {primaryCoupon ? <ProductCouponImageBadge coupon={primaryCoupon} /> : null}

        <div className="absolute end-2 top-2 z-10">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              product.inStock === false
                ? "bg-neutral-100 text-neutral-500"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                product.inStock === false ? "bg-neutral-400" : "bg-emerald-500"
              }`}
            />
            {product.inStock === false ? t("unavailable") : t("available")}
          </span>
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? t("removeFromWishlist") : t("addToWishlist")}
          className="absolute end-2 bottom-2 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/95 text-neutral-500 shadow-sm transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Heart
            className={`h-4 w-4 ${wishlisted ? "fill-primary text-primary" : ""}`}
          />
        </button>

        {product.reviews > 0 ? (
          <div className="absolute start-2 bottom-2 z-10 flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 shadow-sm">
            <StarRating rating={product.rating} showValue={false} />
            <span>{product.rating.toFixed(1)}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <Link href={`/products/${product.id}`} className="outline-none">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
            {product.name[locale]}
          </h3>
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-neutral-900">{prices.current}</p>
            {prices.original ? (
              <p className="truncate text-xs text-neutral-400 line-through">{prices.original}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdding || product.inStock === false}
            aria-label={t("addToCart")}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-white transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
            )}
            <span className="hidden sm:inline">{t("add")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  productIds?: readonly string[];
  sharedVendorProducts?: PublicCatalogProduct[];
  count?: number;
  shell?: boolean;
};

const CELL_CLASS =
  "relative box-border w-[48%] shrink-0 grow-0 px-1.5 py-1.5 min-[390px]:w-[46%] sm:w-[31%] sm:px-2 md:w-[23%] lg:w-[16.66%]";

export function HomeProductRail({
  title,
  subtitle,
  viewAllHref,
  productIds,
  sharedVendorProducts,
  count,
  shell = false,
}: Props) {
  const locale = useLocale() as LocaleKey;
  const t = useTranslations("Homepage.store");
  const isRtl = locale === "ps" || locale === "fa-AF";
  const [vendorRows, setVendorRows] = useState<Row[]>(() =>
    sharedVendorProducts ? sharedVendorProducts.map(toHomeRailRow) : []
  );

  useEffect(() => {
    if (sharedVendorProducts !== undefined) {
      setVendorRows(sharedVendorProducts.map(toHomeRailRow));
      return;
    }

    void fetchPublicCatalogProducts()
      .then((products) => setVendorRows(products.map(toHomeRailRow)))
      .catch(() => setVendorRows([]));
  }, [sharedVendorProducts]);

  const rows = productIds?.length
    ? vendorRows.filter(
        (product) =>
          productIds.includes(product.id) || productIds.includes(product.slug)
      )
    : vendorRows;
  const isLoading = sharedVendorProducts === undefined && vendorRows.length === 0;
  const skeletonCount = 6;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>("[data-rail-item]")?.offsetWidth ?? 220;
    el.scrollBy({ left: dir * cardWidth * 2, behavior: "smooth" });
  }, []);

  const body = (
    <>
      <HomeSectionHeader
        title={title}
        subtitle={subtitle}
        count={count}
        viewAllHref={viewAllHref}
        viewAllLabel={t("viewAll")}
        isRtl={isRtl}
        onPrev={() => scrollByPage(-1)}
        onNext={() => scrollByPage(1)}
        prevLabel={t("productRail.previousProducts")}
        nextLabel={t("productRail.nextProducts")}
      />

      <div className={shell ? "" : "overflow-hidden rounded-2xl bg-white"}>
        {isLoading ? (
          <div className="flex">
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <div key={`home-rail-skeleton-${index}`} className={`${CELL_CLASS} animate-pulse`}>
                <div className="aspect-square rounded-2xl bg-neutral-100" />
                <div className="mt-3 space-y-2 px-1">
                  <div className="h-4 w-full rounded bg-neutral-100" />
                  <div className="h-4 w-3/4 rounded bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-500">
            {t("productRail.noProducts")}
          </p>
        ) : (
          <div
            ref={scrollRef}
            dir="ltr"
            className="flex overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {rows.map((product) => (
              <div key={product.id} data-rail-item className={CELL_CLASS}>
                <HomeRailProductCard product={product} locale={locale} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return <section className="w-full min-w-0">{body}</section>;
}
