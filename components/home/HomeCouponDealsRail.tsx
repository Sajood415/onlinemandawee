"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import {
  getCouponAdjustedPrices,
  getPrimaryProductCoupon,
} from "@/components/products/ProductCouponOffer";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { useCurrency } from "@/store/currency-context";

type LocaleKey = "en" | "ps" | "fa-AF";

function getEndOfDayRemaining() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const diff = Math.max(0, end.getTime() - now.getTime());
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

function useEndOfDayCountdown() {
  const [remaining, setRemaining] = useState(getEndOfDayRemaining);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getEndOfDayRemaining()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return remaining;
}

function CountdownUnit({ value }: { value: number }) {
  return (
    <span className="inline-flex min-w-8 items-center justify-center rounded-lg bg-white px-2 py-1.5 text-base font-bold tabular-nums leading-none text-neutral-900">
      {String(value).padStart(2, "0")}
    </span>
  );
}

function OfferSmileyIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" aria-hidden>
      <text x="14" y="28" fill="white" fontSize="22" fontWeight="700">
        %
      </text>
      <text x="38" y="28" fill="white" fontSize="22" fontWeight="700">
        %
      </text>
      <path
        d="M18 44 Q32 54 46 44"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DealProductCard({
  product,
  locale,
  showDivider,
}: {
  product: PublicCatalogProduct;
  locale: LocaleKey;
  showDivider?: boolean;
}) {
  const { formatPrice } = useCurrency();
  const primaryCoupon = getPrimaryProductCoupon(product.availableCoupons);
  const prices = getCouponAdjustedPrices(
    product.price,
    product.currency,
    primaryCoupon,
    formatPrice
  );
  const discountLabel =
    primaryCoupon?.discountType === "PERCENTAGE"
      ? `${primaryCoupon.discountValue}%`
      : primaryCoupon?.label;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative flex h-[17.5rem] w-[10.5rem] shrink-0 flex-col bg-white px-4 py-5 sm:w-[11.75rem]"
    >
      {showDivider ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 h-[72%] w-px -translate-y-1/2 bg-neutral-200"
        />
      ) : null}

      <div className="relative mx-auto h-[7.5rem] w-full max-w-[8.5rem] shrink-0">
        <CatalogImage
          src={product.image}
          alt={product.name[locale]}
          fill
          className="object-contain object-center transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="140px"
        />
      </div>

      <h3 className="mt-4 line-clamp-2 min-h-10 text-left text-xs leading-5 text-neutral-600">
        {product.name[locale]}
      </h3>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-neutral-900">{prices.current}</p>
          {prices.original ? (
            <p className="truncate text-xs text-neutral-400 line-through">{prices.original}</p>
          ) : null}
        </div>
        {discountLabel ? (
          <span className="shrink-0 rounded-lg bg-[#ec1b23] px-2 py-1 text-xs font-bold text-white">
            {discountLabel}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function PromoAside({
  countdown,
  title,
  viewAllLabel,
  isRtl,
}: {
  countdown: ReturnType<typeof getEndOfDayRemaining>;
  title: string;
  viewAllLabel: string;
  isRtl: boolean;
}) {
  return (
    <aside className="flex w-[8.75rem] shrink-0 flex-col items-center justify-between px-3 py-5 text-white sm:w-[10.5rem] sm:px-4 sm:py-6">
      <div className="flex w-full flex-col items-center text-center">
        <p className="text-sm font-bold leading-snug sm:text-[15px]">{title}</p>
        <div className="mt-4 flex items-center gap-1.5">
          <CountdownUnit value={countdown.hours} />
          <span className="text-sm font-bold">:</span>
          <CountdownUnit value={countdown.minutes} />
          <span className="text-sm font-bold">:</span>
          <CountdownUnit value={countdown.seconds} />
        </div>
        <div className="mt-5">
          <OfferSmileyIcon />
        </div>
      </div>

      <Link
        href="/deals"
        className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-white transition hover:text-white/90 sm:text-sm"
      >
        {isRtl ? <ChevronLeft className="h-4 w-4" /> : null}
        <span>{viewAllLabel}</span>
        {!isRtl ? <ChevronRight className="h-4 w-4" /> : null}
      </Link>
    </aside>
  );
}

function ProductRail({
  dealProducts,
  locale,
  scrollRef,
  onScroll,
  previousDealsLabel,
  nextDealsLabel,
}: {
  dealProducts: PublicCatalogProduct[];
  locale: LocaleKey;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: (dir: -1 | 1) => void;
  previousDealsLabel: string;
  nextDealsLabel: string;
}) {
  return (
    <div className="relative min-w-0 flex-1 bg-white">
      <button
        type="button"
        onClick={() => onScroll(-1)}
        className="absolute -left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-neutral-800 sm:flex"
        aria-label={previousDealsLabel}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onScroll(1)}
        className="absolute -right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md transition hover:text-neutral-800 sm:flex"
        aria-label={nextDealsLabel}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollRef}
        dir="ltr"
        className="flex overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {dealProducts.map((product, index) => (
          <div key={product.id} data-deal-item>
            <DealProductCard product={product} locale={locale} showDivider={index > 0} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeCouponDealsRail() {
  const locale = useLocale() as LocaleKey;
  const t = useTranslations("Homepage.store");
  const isRtl = locale === "ps" || locale === "fa-AF";
  const countdown = useEndOfDayCountdown();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<PublicCatalogProduct[] | null>(null);

  useEffect(() => {
    void fetchPublicCatalogProducts()
      .then((items) =>
        setProducts(items.filter((item) => (item.availableCoupons?.length ?? 0) > 0))
      )
      .catch(() => setProducts([]));
  }, []);

  const dealProducts = useMemo(() => products ?? [], [products]);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>("[data-deal-item]")?.offsetWidth ?? 168;
    el.scrollBy({ left: dir * cardWidth * 3, behavior: "smooth" });
  }, []);

  if (products === null) {
    return (
      <section className="w-full min-w-0 pb-4">
        <div className="h-[17.5rem] animate-pulse rounded-2xl bg-neutral-100" />
      </section>
    );
  }

  if (dealProducts.length === 0) return null;

  const promoAside = (
    <PromoAside
      countdown={countdown}
      title={t("amazingOffer")}
      viewAllLabel={t("viewAll")}
      isRtl={isRtl}
    />
  );

  const productRail = (
    <ProductRail
      dealProducts={dealProducts}
      locale={locale}
      scrollRef={scrollRef}
      onScroll={scrollByPage}
      previousDealsLabel={t("deals.previousDeals")}
      nextDealsLabel={t("deals.nextDeals")}
    />
  );

  return (
    <section className="w-full min-w-0 pb-4">
      <div className="overflow-hidden rounded-2xl bg-[#ec1b23] p-2 sm:p-2.5">
        <div className="flex overflow-hidden rounded-xl">
          {isRtl ? (
            <>
              {promoAside}
              {productRail}
            </>
          ) : (
            <>
              {productRail}
              {promoAside}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
