"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Loader2,
  Medal,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import {
  getCouponAdjustedPrices,
  getPrimaryProductCoupon,
} from "@/components/products/ProductCouponOffer";
import {
  fetchPublicCatalogProducts,
  type PublicCatalogProduct,
} from "@/lib/products/public-catalog";
import { toast } from "@/lib/utils/toast";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";

const BENEFITS = [
  { icon: Truck, key: "delivery" as const },
  { icon: Medal, key: "quality" as const },
  { icon: ShieldCheck, key: "guarantee" as const },
];

type LocaleKey = "en" | "ps" | "fa-AF";

function FeaturedProductCard({
  product,
  locale,
}: {
  product: PublicCatalogProduct;
  locale: LocaleKey;
}) {
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

  const handleAdd = async (event: React.MouseEvent) => {
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
    <div className="flex h-full w-[9.5rem] shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-md sm:w-[11rem]">
      <Link
        href={`/products/${product.id}`}
        className="relative block aspect-square bg-[#F7F4EF] outline-none"
      >
        <CatalogImage
          src={product.image}
          alt={product.name[locale]}
          fill
          className="object-cover object-center"
          sizes="176px"
        />
        <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#E0B252]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#0F3460] ring-1 ring-[#E0B252]/40">
          <Crown className="h-3 w-3 text-[#E0B252]" />
          {t("featured.badgeShort")}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 px-2.5 py-2.5">
        <Link href={`/products/${product.id}`} className="outline-none">
          <h3 className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-snug text-gray-800">
            {product.name[locale]}
          </h3>
        </Link>
        <div className="mt-auto flex items-center justify-between gap-1">
          <p className="truncate text-sm font-bold text-gray-900">{prices.current}</p>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding || !product.inStock}
            aria-label={t("addToCart")}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#ec1b23] px-2.5 text-white transition hover:bg-[#c4161d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomeFeaturedBanner() {
  const t = useTranslations("Homepage.store.featured");
  const tStore = useTranslations("Homepage.store");
  const locale = useLocale() as LocaleKey;
  const isRtl = locale === "ps" || locale === "fa-AF";
  const [products, setProducts] = useState<PublicCatalogProduct[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    void fetchPublicCatalogProducts()
      .then((items) => {
        if (!mounted) return;
        setProducts(items.filter((item) => item.sellerType === "PLATFORM").slice(0, 12));
      })
      .catch(() => {
        if (mounted) setProducts([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const viewAllHref = useMemo(() => {
    const slug = products?.find((p) => p.vendorSlug)?.vendorSlug;
    return slug ? `/vendors/${slug}` : "/products";
  }, [products]);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
  }, []);

  const platformProducts = products ?? [];
  const showProducts = platformProducts.length > 0;

  return (
    <section className="w-full min-w-0 py-2 sm:py-3">
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className="relative overflow-hidden rounded-2xl bg-[#0F3460] px-4 py-6 shadow-[0_12px_40px_rgba(15,52,96,0.28)] sm:rounded-3xl sm:px-6 sm:py-8 lg:px-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #ec1b23 0%, transparent 40%), radial-gradient(circle at 80% 70%, #ffffff 0%, transparent 35%), repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.04) 12px, rgba(255,255,255,0.04) 24px)",
          }}
        />

        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0B252]/20 px-3 py-1 text-xs font-bold text-[#E0B252] ring-1 ring-[#E0B252]/35">
                <Crown className="h-3.5 w-3.5" />
                {t("badge")}
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {t("title")}
              </h2>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/75">
                {t("subtitle")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {showProducts ? (
                <div className="hidden items-center gap-1.5 sm:flex">
                  <button
                    type="button"
                    onClick={() => scrollByPage(-1)}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label={tStore("productRail.previousProducts")}
                  >
                    {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollByPage(1)}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                    aria-label={tStore("productRail.nextProducts")}
                  >
                    {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              ) : null}
              <Link
                href={viewAllHref}
                className="inline-flex items-center justify-center rounded-full bg-[#ec1b23] px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-[#c4161d]"
              >
                {t("cta")}
              </Link>
            </div>
          </div>

          {products === null ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`featured-skel-${i}`}
                  className="h-52 w-[9.5rem] shrink-0 animate-pulse rounded-2xl bg-white/10 sm:w-[11rem]"
                />
              ))}
            </div>
          ) : showProducts ? (
            <div
              ref={scrollRef}
              dir="ltr"
              className="flex gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {platformProducts.map((product) => (
                <FeaturedProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-white/10 px-4 py-6 text-center text-sm text-white/70">
              {tStore("productRail.noProducts")}
            </p>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E0B252] text-[#0F3460]">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white sm:text-sm">
                    {t(`benefits.${key}.title`)}
                  </p>
                  <p className="text-[11px] leading-snug text-white/65 sm:text-xs">
                    {t(`benefits.${key}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
