"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Baby, ChevronRight, Gift, Loader2, PackageCheck } from "lucide-react";

import { ProductCard } from "@/components/products/ProductCard";
import { ProductsEmptyState } from "@/components/products/ProductsEmptyState";
import { ProductsGridSkeleton } from "@/components/products/ProductsGridSkeleton";
import type { CatalogRow } from "@/components/products/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { fetchPublicCatalogProducts } from "@/lib/products/public-catalog";
import { useRouter } from "@/i18n/navigation";

function getBabyPackagesCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    title: en ? "Baby Packages" : ps ? "د ماشوم بستې" : "بسته‌های نوزاد",
    subtitle: en
      ? "Explore newborn essentials and baby-care package picks prepared for thoughtful gifting."
      : ps
        ? "د نوي زیږېدلي او ماشوم پاملرنې اړین توکي د ډالۍ لپاره وګورئ."
        : "لوازم نوزاد و گزینه‌های بسته کودک را برای هدیه‌دادن ببینید.",
    badge: en ? "Newborn gift collection" : ps ? "د نوي ماشوم ډالۍ ټولګه" : "مجموعه هدیه نوزاد",
    packageTypesTitle: en ? "Package types" : ps ? "د بستو ډولونه" : "انواع بسته",
    packageTypesSubtitle: en
      ? "Build a package by category using currently available marketplace products."
      : ps
        ? "د موجوده محصولاتو له کټګوریو څخه بسته برابره کړئ."
        : "با محصولات موجود، بسته را براساس دسته‌بندی آماده کنید.",
    productsTitle: en ? "Baby package essentials" : ps ? "د ماشوم بستې توکي" : "لوازم بسته نوزاد",
    productsSubtitle: en
      ? "Curated products suitable for newborn and baby-care packages."
      : ps
        ? "هغه توکي چې د نوي زیږېدلي او ماشوم پاملرنې لپاره مناسب دي."
        : "محصولات مناسب برای بسته‌های نوزاد و مراقبت کودک.",
    noProducts: en ? "No baby package products yet" : ps ? "تر اوسه د ماشوم بستې توکي نشته" : "هنوز محصول بسته نوزاد موجود نیست",
    noProductsHint: en
      ? "As vendors add baby-care items, they will appear here."
      : ps
        ? "کله چې پلورونکي د ماشوم پاملرنې توکي اضافه کړي، دلته به ښکاره شي."
        : "با اضافه‌شدن محصولات کودک توسط فروشندگان، اینجا نمایش داده می‌شود.",
    browseAll: en ? "Browse all products" : ps ? "ټول محصولات وګورئ" : "مشاهده همه محصولات",
    requestCustom: en ? "Request custom gift package" : ps ? "د ځانګړې ډالۍ بسته وغواړئ" : "درخواست بسته هدیه سفارشی",
    ctaBrowse: en ? "Browse marketplace" : ps ? "بازار وګورئ" : "مرور بازار",
  };
}

function isBabyPackageProduct(product: CatalogRow) {
  const text = [
    product.name.en,
    product.name.ps,
    product.name["fa-AF"],
    product.category,
    "categoryName" in product ? product.categoryName : "",
    "description" in product ? product.description.en : "",
    "description" in product ? product.description.ps : "",
    "description" in product ? product.description["fa-AF"] : "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    text.includes("baby") ||
    text.includes("newborn") ||
    text.includes("new born") ||
    text.includes("infant") ||
    text.includes("diaper") ||
    text.includes("milk") ||
    text.includes("feeding")
  );
}

export function BabyPackagesPageClient() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getBabyPackagesCopy(locale);
  const router = useRouter();

  const [products, setProducts] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchPublicCatalogProducts();
        if (mounted) setProducts(data);
      } catch {
        if (mounted) setProducts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const babyProducts = useMemo(
    () => products.filter((product) => isBabyPackageProduct(product)),
    [products]
  );

  const packageGroups = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const product of babyProducts) {
      const key = product.categoryName || product.category;
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }
    return Array.from(grouped.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [babyProducts]);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f8fc]">
      <section className="border-b border-[#0f3460]/10 bg-linear-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {copy.home}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{copy.title}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
              <Baby className="h-3.5 w-3.5" />
              {copy.badge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
              {copy.subtitle}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/gifts"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0f3460] transition hover:bg-white/90"
              >
                <Gift className="h-4 w-4" />
                {copy.requestCustom}
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <PackageCheck className="h-4 w-4" />
                {copy.ctaBrowse}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,52,96,0.06)] sm:p-6">
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{copy.packageTypesTitle}</h2>
          <p className="mt-1 text-sm text-neutral-600">{copy.packageTypesSubtitle}</p>

          {loading ? (
            <div className="mt-6 flex min-h-[96px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#0f3460]/40" />
            </div>
          ) : packageGroups.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {packageGroups.map((group) => (
                <div
                  key={group.name}
                  className="rounded-xl border border-[#0f3460]/10 bg-[#0f3460]/3 px-3 py-3 text-center"
                >
                  <p className="line-clamp-2 text-sm font-semibold text-[#0f3460]">{group.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{group.count}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{copy.productsTitle}</h2>
            <p className="mt-1 text-sm text-neutral-600">{copy.productsSubtitle}</p>
          </div>

          {loading ? (
            <ProductsGridSkeleton />
          ) : babyProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5 2xl:grid-cols-4">
              {babyProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} locale={locale} priority={index < 4} />
              ))}
            </div>
          ) : (
            <ProductsEmptyState
              title={copy.noProducts}
              description={copy.noProductsHint}
              actionLabel={copy.browseAll}
              onClearFilters={() => router.push("/products")}
            />
          )}
        </section>
      </div>
    </div>
  );
}
