"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, ShoppingCart } from "lucide-react";
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

const BRAND_RED = "#ec1b23";

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
  availableCoupons?: PublicCatalogProduct["availableCoupons"];
};

function toRow(product: PublicCatalogProduct): Row {
  return {
    id: product.id,
    slug: product.slug,
    price: product.price,
    image: product.image,
    name: product.name,
    rating: product.rating,
    reviews: product.reviews,
    currency: product.currency,
    availableCoupons: product.availableCoupons,
  };
}

function HomeRailProductCard({ product, locale }: { product: Row; locale: LocaleKey }) {
  const t = useTranslations("Homepage.store");
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

  return (
    <div className="group flex h-full flex-col rounded-lg border-2 border-transparent p-1.5 transition-colors duration-200 hover:border-[#ec1b23] sm:p-2">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden">
        <Link
          href={`/products/${product.id}`}
          className="absolute inset-0 z-0 block outline-none"
        >
          <CatalogImage
            src={product.image}
            alt={product.name[locale]}
            fill
            className="object-contain object-center"
            sizes="(max-width: 640px) 42vw, 220px"
          />
        </Link>

        {primaryCoupon ? <ProductCouponImageBadge coupon={primaryCoupon} /> : null}

        <div className="absolute bottom-2 left-2 z-20 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAdding}
            aria-label={t("addToCart")}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm bg-[#2563eb] text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <Link
        href={`/products/${product.id}`}
        className="mt-3 block px-1 pb-1 outline-none sm:mt-3.5 sm:px-2 sm:pb-1.5"
      >
        <h3 className="line-clamp-2 text-left text-[13px] font-normal leading-snug text-[#2563eb] sm:text-sm">
          {product.name[locale]}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:mt-2">
          <span className="text-sm font-bold text-neutral-900">{prices.current}</span>
          {prices.original ? (
            <span className="text-xs text-neutral-400 line-through">{prices.original}</span>
          ) : null}
        </div>

        {product.reviews > 0 ? (
          <div className="mt-1.5 flex items-center gap-1 sm:mt-2">
            <StarRating rating={product.rating} showValue={false} />
            <span className="text-xs text-neutral-500">({product.reviews})</span>
          </div>
        ) : null}
      </Link>
    </div>
  );
}

type Props = {
  title: string;
  viewAllHref: string;
  productIds?: readonly string[];
  sharedVendorProducts?: PublicCatalogProduct[];
};

const CELL_CLASS =
  "relative box-border w-[44%] shrink-0 grow-0 px-2 py-3 min-[390px]:w-[46%] min-[390px]:px-3 sm:w-[31%] sm:px-4 sm:py-5 md:w-[23%] lg:w-[20%]";

function CellDivider() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-0 top-1/2 h-[60%] w-px -translate-y-1/2 bg-neutral-200"
    />
  );
}

export function HomeProductRail({
  title,
  viewAllHref,
  productIds,
  sharedVendorProducts,
}: Props) {
  const locale = useLocale() as LocaleKey;
  const t = useTranslations("Homepage.store");
  const [vendorRows, setVendorRows] = useState<Row[]>(() =>
    sharedVendorProducts ? sharedVendorProducts.map(toRow) : []
  );

  useEffect(() => {
    if (sharedVendorProducts !== undefined) {
      setVendorRows(sharedVendorProducts.map(toRow));
      return;
    }

    void fetchPublicCatalogProducts()
      .then((products) => setVendorRows(products.map(toRow)))
      .catch(() => setVendorRows([]));
  }, [sharedVendorProducts]);

  const rows = productIds?.length
    ? vendorRows.filter(
        (product) =>
          productIds.includes(product.id) || productIds.includes(product.slug)
      )
    : vendorRows;
  const isLoading = sharedVendorProducts === undefined && vendorRows.length === 0;
  const skeletonCount = 5;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>("[data-rail-item]")?.offsetWidth ?? 220;
    el.scrollBy({ left: dir * cardWidth * 2, behavior: "smooth" });
  }, []);

  return (
    <section className="w-full min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4 sm:gap-4">
        <h2 className="min-w-0 text-base font-bold text-neutral-900 sm:text-lg lg:text-xl">{title}</h2>
        <Link
          href={viewAllHref}
          className="shrink-0 rounded px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 sm:px-4 sm:py-2 sm:text-sm"
          style={{ backgroundColor: BRAND_RED }}
        >
          {t("viewAll")}
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-neutral-200/80 bg-white shadow-sm">
        {!isLoading && rows.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              className="absolute left-0 top-1/2 z-30 hidden h-10 w-9 -translate-y-1/2 items-center justify-center border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 sm:flex"
              aria-label={t("productRail.previousProducts")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              className="absolute right-0 top-1/2 z-30 hidden h-10 w-9 -translate-y-1/2 items-center justify-center border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 sm:flex"
              aria-label={t("productRail.nextProducts")}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}

        {isLoading ? (
          <div className="flex">
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <div key={`home-rail-skeleton-${index}`} className={`${CELL_CLASS} animate-pulse`}>
                {index > 0 ? <CellDivider /> : null}
                <div className="aspect-square bg-neutral-100" />
                <div className="mt-3 space-y-2">
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
            {rows.map((product, index) => (
              <div key={product.id} data-rail-item className={CELL_CLASS}>
                {index > 0 ? <CellDivider /> : null}
                <HomeRailProductCard product={product} locale={locale} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
