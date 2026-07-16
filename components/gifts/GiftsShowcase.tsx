"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Gift, Loader2 } from "lucide-react";

import { GiftRequestForm } from "@/components/gifts/GiftRequestForm";
import { ProductCard } from "@/components/products/ProductCard";
import type { CatalogRow } from "@/components/products/types";
import { Link } from "@/i18n/navigation";
import { filterGiftProducts } from "@/lib/gifts/filter-gift-products";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { fetchPublicCatalogProducts } from "@/lib/products/public-catalog";

const HERO_IMAGE = "/gifts/hero.jpg";
const DUO_IMAGES = [
  {
    src: "/gifts/duo-1.jpg",
    href: "#gift-request",
    altKey: "duo.leftAlt",
    labelKey: "duo.leftLabel",
  },
  {
    src: "/gifts/duo-2.jpg",
    href: "#gift-sets",
    altKey: "duo.rightAlt",
    labelKey: "duo.rightLabel",
  },
] as const;
const PROMO_IMAGES = [
  {
    src: "/gifts/promo-1.jpg",
    href: "#gift-request",
    altKey: "promos.oneAlt",
    labelKey: "promos.oneLabel",
  },
  {
    src: "/gifts/promo-2.jpg",
    href: "#gift-sets",
    altKey: "promos.twoAlt",
    labelKey: "promos.twoLabel",
  },
  {
    src: "/gifts/promo-3.jpg",
    href: "#gift-sets",
    altKey: "promos.threeAlt",
    labelKey: "promos.threeLabel",
  },
  {
    src: "/gifts/promo-4.jpg",
    href: "#gift-request",
    altKey: "promos.fourAlt",
    labelKey: "promos.fourLabel",
  },
] as const;

export function GiftsShowcase() {
  const t = useTranslations("GiftPages.landing");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const [vendorProducts, setVendorProducts] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const products = await fetchPublicCatalogProducts();
        if (mounted) setVendorProducts(products);
      } catch {
        if (mounted) setVendorProducts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const giftProducts = useMemo(
    () => filterGiftProducts(vendorProducts, locale),
    [locale, vendorProducts]
  );

  const steps = [
    {
      title: t("howItWorks.steps.tell.title"),
      description: t("howItWorks.steps.tell.description"),
    },
    {
      title: t("howItWorks.steps.quote.title"),
      description: t("howItWorks.steps.quote.description"),
    },
    {
      title: t("howItWorks.steps.deliver.title"),
      description: t("howItWorks.steps.deliver.description"),
    },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      <section className="relative w-full min-w-0 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt={t("heroImageAlt")}
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-[#0F3460]/82" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_44%)]"
          />
        </div>

        <div className="relative mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {t("home")}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{t("title")}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {t("subtitle")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#gift-request"
              className="inline-flex min-h-11 items-center justify-center bg-white px-5 py-2.5 text-sm font-semibold text-[#0F3460] transition hover:bg-neutral-100"
            >
              {t("cta.requestGift")}
            </a>
            <a
              href="#gift-sets"
              className="inline-flex min-h-11 items-center justify-center border border-white/35 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t("cta.browseSets")}
            </a>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 py-3 sm:py-4">
        <div className="mx-auto w-full max-w-[1540px] px-4 sm:px-6">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3">
            {DUO_IMAGES.map((item) => (
              <a
                key={item.src}
                href={item.href}
                className="relative block min-h-[140px] flex-1 overflow-hidden sm:min-h-[180px] lg:min-h-[200px]"
              >
                <Image
                  src={item.src}
                  alt={t(item.altKey)}
                  fill
                  className="object-cover object-center transition duration-500 hover:scale-[1.02]"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#0F3460]/75 via-[#0F3460]/15 to-transparent" />
                <span className="absolute inset-s-3 bottom-3 text-sm font-semibold text-white sm:inset-s-4 sm:bottom-4 sm:text-base">
                  {t(item.labelKey)}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 pb-3 sm:pb-4">
        <div className="mx-auto w-full max-w-[1540px] px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {PROMO_IMAGES.map((item) => (
              <a
                key={item.src}
                href={item.href}
                className="group relative block aspect-4/3 overflow-hidden sm:aspect-5/3"
              >
                <Image
                  src={item.src}
                  alt={t(item.altKey)}
                  fill
                  className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-[#0F3460]/30 transition group-hover:bg-[#0F3460]/15" />
                <span className="absolute inset-s-2 bottom-2 text-xs font-semibold text-white drop-shadow sm:inset-s-3 sm:bottom-3 sm:text-sm">
                  {t(item.labelKey)}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="gift-request" className="w-full min-w-0 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[1540px] px-4 sm:px-6">
          <GiftRequestForm locale={locale} />
        </div>
      </section>

      <section className="w-full border-t border-black/5">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">
            {t("howItWorks.title")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">{t("howItWorks.subtitle")}</p>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {steps.map((step, index) => (
              <li key={step.title} className="min-w-0">
                <span className="block text-3xl font-bold tabular-nums text-[#0F3460]/25">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="gift-sets" className="w-full border-t border-black/5 bg-white/50">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">
                {t("curatedTitle")}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">{t("curatedSubtitle")}</p>
            </div>
            <p className="text-sm text-neutral-500">
              {loading ? "…" : t("results", { count: giftProducts.length })}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0F3460]/40" />
            </div>
          ) : giftProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
              {giftProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  priority={index < 4}
                />
              ))}
            </div>
          ) : (
            <div className="border-t border-neutral-200 px-2 py-14 text-center">
              <Gift className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
              <h3 className="text-lg font-bold text-neutral-900">{t("noGifts")}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{t("noGiftsHint")}</p>
              <Link
                href="/products"
                className="mt-6 inline-flex bg-[#0F3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
              >
                {t("browseAll")}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function GiftsShowcasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eef1f6]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F3460]/40" />
        </div>
      }
    >
      <GiftsShowcase />
    </Suspense>
  );
}
