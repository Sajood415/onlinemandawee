"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { CalendarDays, ChevronRight, Store } from "lucide-react";

import { CatalogImage } from "@/components/catalog/CatalogImage";
import { ProductCard } from "@/components/products/ProductCard";
import { PageLoader } from "@/components/ui/PageLoader";
import { Link } from "@/i18n/navigation";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import {
  mapApiProductToCatalog,
  type ApiCatalogProduct,
} from "@/lib/products/public-catalog";

type PublicPromoBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  couponCode: string | null;
};

type PublicStoreCoupon = {
  code: string;
  label: string;
};

type ApiVendorStore = {
  vendor: {
    id: string;
    storeName: string | null;
    storeSlug: string | null;
    logoUrl: string | null;
    description: string | null;
    approvedAt: string | null;
  };
  products: ApiCatalogProduct[];
  promoBanners?: PublicPromoBanner[];
  publicCoupons?: PublicStoreCoupon[];
};

export function VendorStoreShowcase() {
  const params = useParams();
  const t = useTranslations("VendorsPages.store");
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const slug = params.slug as string;
  const [loading, setLoading] = useState(true);
  const [apiStore, setApiStore] = useState<ApiVendorStore | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setApiStore(null);

    const load = async () => {
      try {
        const res = await fetch(`/api/vendors/${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await parseApiResponse<ApiVendorStore>(res);
          if (mounted) setApiStore(data);
          return;
        }
      } catch {
        // API unavailable
      }

      if (mounted) setApiStore(null);
    };

    void load().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [slug]);

  const vendorProducts = useMemo(() => {
    return apiStore?.products.map(mapApiProductToCatalog) ?? [];
  }, [apiStore]);

  const vendorName = apiStore?.vendor.storeName ?? slug.replaceAll("-", " ");
  const vendorDescription = apiStore?.vendor.description ?? t("defaultDescription");
  const vendorLogo = apiStore?.vendor.logoUrl ?? null;
  const promoBanners = apiStore?.promoBanners ?? [];
  const publicCoupons = apiStore?.publicCoupons ?? [];
  const vendorCover =
    promoBanners[0]?.imageUrl ??
    vendorLogo ??
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80";
  const joinedYear = apiStore?.vendor.approvedAt
    ? new Date(apiStore.vendor.approvedAt).getFullYear()
    : new Date().getFullYear();

  if (loading) {
    return <PageLoader message={t("loading")} className="bg-[#eef1f6]" fullScreen />;
  }

  if (!apiStore) {
    return (
      <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#eef1f6]">
        <div className="mx-auto max-w-[1540px] px-4 py-20 text-center sm:px-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center bg-[#0F3460]/10 text-[#0F3460]">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">{t("notFound")}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{t("notFoundHint")}</p>
          <Link
            href="/vendors"
            className="mt-6 inline-flex bg-[#0F3460] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
          >
            {t("backToVendors")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0 bg-[#eef1f6]">
      <section className="relative overflow-hidden">
        <div className="relative h-[280px] sm:h-[340px] lg:h-[400px]">
          <Image
            src={vendorCover}
            alt={vendorName}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#0a2748] via-[#0F3460]/55 to-[#0F3460]/20" />
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-[1540px] px-4 pb-6 sm:px-6 sm:pb-8">
            <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-white/70">
              <Link href="/" className="transition hover:text-white hover:underline">
                {t("home")}
              </Link>
              <ChevronRight className={`h-4 w-4 shrink-0 opacity-70 ${isRtl ? "rotate-180" : ""}`} />
              <Link href="/vendors" className="transition hover:text-white hover:underline">
                {t("vendors")}
              </Link>
              <ChevronRight className={`h-4 w-4 shrink-0 opacity-70 ${isRtl ? "rotate-180" : ""}`} />
              <span className="truncate font-medium text-white">{vendorName}</span>
            </nav>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden border-2 border-white bg-white shadow-md sm:h-24 sm:w-24">
                {vendorLogo ? (
                  <Image src={vendorLogo} alt={vendorName} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#0F3460]/5 text-[#0F3460]">
                    <Store className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pb-0.5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                  {t("verified")}
                </p>
                <h1 className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">
                  {vendorName}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                  {vendorDescription}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/65">
                  <span>{t("productsCount", { count: vendorProducts.length })}</span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("joined", { year: joinedYear })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {(promoBanners.length > 0 || publicCoupons.length > 0) && (
        <section className="border-b border-black/5 bg-white/70">
          <div className="mx-auto w-full max-w-[1540px] space-y-4 px-4 py-5 sm:px-6">
            {promoBanners.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {promoBanners.map((banner) => (
                  <div key={banner.id} className="relative h-36 overflow-hidden sm:h-40">
                    <CatalogImage
                      src={banner.imageUrl}
                      alt={banner.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#0F3460]/90 via-[#0F3460]/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-base font-bold sm:text-lg">{banner.title}</p>
                      {banner.subtitle ? (
                        <p className="mt-0.5 text-sm text-white/85">{banner.subtitle}</p>
                      ) : null}
                      {banner.couponCode ? (
                        <p className="mt-2 inline-block bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#0F3460]">
                          {t("useCode")}: {banner.couponCode}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {publicCoupons.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {publicCoupons.map((coupon) => (
                  <span
                    key={coupon.code}
                    className="border border-[#0F3460]/20 bg-[#0F3460]/5 px-3 py-1.5 text-xs font-semibold text-[#0F3460]"
                  >
                    {coupon.code} · {coupon.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      )}

      <section className="w-full">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{t("productsTitle")}</h2>
            <p className="text-sm text-neutral-500">
              {t("productsCount", { count: vendorProducts.length })}
            </p>
          </div>

          {vendorProducts.length === 0 ? (
            <div className="border border-neutral-200/80 bg-white px-6 py-14 text-center">
              <Store className="mx-auto mb-4 h-10 w-10 text-neutral-300" />
              <h3 className="text-lg font-bold text-neutral-900">{t("noProducts")}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{t("noProductsHint")}</p>
              <Link
                href="/vendors"
                className="mt-6 inline-flex bg-[#0F3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
              >
                {t("backToVendors")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
              {vendorProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  priority={index < 4}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
