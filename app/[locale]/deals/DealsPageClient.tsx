"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { BadgePercent, ChevronRight, Loader2, Sparkles, Tag } from "lucide-react";

import { ProductCard } from "@/components/products/ProductCard";
import { ProductsEmptyState } from "@/components/products/ProductsEmptyState";
import { ProductsGridSkeleton } from "@/components/products/ProductsGridSkeleton";
import type { CatalogRow } from "@/components/products/types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { fetchPublicCatalogProducts } from "@/lib/products/public-catalog";
import { useRouter } from "@/i18n/navigation";

function getDealsCopy(locale: SupportedLocale) {
  const en = locale === "en";
  const ps = locale === "ps";

  return {
    home: en ? "Home" : ps ? "کور" : "خانه",
    title: en ? "Deals" : ps ? "تخفیفونه" : "تخفیف‌ها",
    subtitle: en
      ? "Browse active marketplace offers and curated value picks from trusted vendors."
      : ps
        ? "د باوري پلورونکو فعال وړاندیزونه او غوره تخفیفونه وګورئ."
        : "پیشنهادهای فعال بازار و گزینه‌های ارزشمند از فروشندگان معتبر را ببینید.",
    badge: en ? "Limited-time offers" : ps ? "لنډمهاله وړاندیزونه" : "پیشنهادهای محدود",
    featuredTitle: en ? "Featured deals" : ps ? "غوره تخفیفونه" : "تخفیف‌های ویژه",
    featuredSubtitle: en
      ? "Hand-picked products currently showing discounts or promotional offers."
      : ps
        ? "هغه توکي چې اوس مهال تخفیف یا ځانګړی وړاندیز لري."
        : "محصولات منتخب که فعلاً دارای تخفیف یا پیشنهاد ویژه هستند.",
    allDealsTitle: en ? "All active deals" : ps ? "ټول فعال تخفیفونه" : "همه تخفیف‌های فعال",
    dealsCount: en ? "active deals" : ps ? "فعال تخفیفونه" : "تخفیف فعال",
    noDeals: en ? "No active deals yet" : ps ? "تر اوسه فعال تخفیف نشته" : "هنوز تخفیف فعالی نیست",
    noDealsHint: en
      ? "As vendors publish promotions, they will appear here."
      : ps
        ? "کله چې پلورونکي وړاندیزونه خپاره کړي، دلته به ښکاره شي."
        : "وقتی فروشندگان پیشنهادها را منتشر کنند، اینجا نمایش داده می‌شود.",
    browseProducts: en ? "Browse all products" : ps ? "ټول محصولات وګورئ" : "مشاهده همه محصولات",
    browseAllDeals: en ? "View all deals" : ps ? "ټول تخفیفونه وګورئ" : "مشاهده همه تخفیف‌ها",
  };
}

function isDealProduct(product: CatalogRow) {
  if ("availableCoupons" in product && (product.availableCoupons?.length ?? 0) > 0) {
    return true;
  }

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
    text.includes("deal") ||
    text.includes("discount") ||
    text.includes("offer") ||
    text.includes("sale")
  );
}

export function DealsPageClient() {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getDealsCopy(locale);
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

  const dealProducts = useMemo(
    () => products.filter((product) => isDealProduct(product)),
    [products]
  );
  const featuredDeals = dealProducts.slice(0, 4);

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
              <Sparkles className="h-3.5 w-3.5" />
              {copy.badge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
              {copy.subtitle}
            </p>
            <p className="mt-4 text-sm text-white/80">
              <span className="font-semibold text-white">
                {loading ? "..." : dealProducts.length}
              </span>{" "}
              {copy.dealsCount}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-[#0f3460]/10 bg-white p-5 shadow-[0_8px_30px_rgba(15,52,96,0.06)] sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{copy.featuredTitle}</h2>
              <p className="mt-1 text-sm text-neutral-600">{copy.featuredSubtitle}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0f3460]/8 px-3 py-1 text-xs font-semibold text-[#0f3460]">
              <BadgePercent className="h-3.5 w-3.5" />
              {featuredDeals.length}
            </span>
          </div>

          {loading ? (
            <ProductsGridSkeleton />
          ) : featuredDeals.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
              {featuredDeals.map((product, index) => (
                <ProductCard key={product.id} product={product} locale={locale} priority={index < 4} />
              ))}
            </div>
          ) : (
            <ProductsEmptyState
              title={copy.noDeals}
              description={copy.noDealsHint}
              actionLabel={copy.browseProducts}
              onClearFilters={() => router.push("/products")}
            />
          )}
        </section>

        {!loading && dealProducts.length > 0 ? (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{copy.allDealsTitle}</h2>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f3460] transition hover:border-[#0f3460]/30 hover:bg-[#0f3460]/5"
              >
                <Tag className="h-4 w-4" />
                {copy.browseAllDeals}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5 2xl:grid-cols-4">
              {dealProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} locale={locale} priority={index < 4} />
              ))}
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0f3460]/40" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
