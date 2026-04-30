"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Apple,
  Coffee,
  Cookie,
  Wine,
  Carrot,
  Milk,
  Baby,
  Leaf,
  Truck,
  ShieldCheck,
  BadgePercent,
  ShoppingCart,
  Eye,
  Store,
  Tag,
} from "lucide-react";
import productData from "@/data/product.json";

type Locale = "en" | "ps" | "fa-AF";

type Product = {
  id: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  name: { en: string; ps: string; "fa-AF": string };
  badge: { en: string; ps: string; "fa-AF": string };
  rating: number;
  reviews: number;
};

const HERO_SLIDES = [
  { image: "/images/hero-slide-1.jpg" },
  { image: "/images/hero-slide-2.jpg" },
  { image: "/images/hero-slide-3.jpg" },
] as const;

const TOP_CATEGORIES = [
  { id: "breakfast", icon: Coffee, href: "/category/breakfast" },
  { id: "grocery", icon: ShoppingCart, href: "/category/grocery" },
  { id: "snacks", icon: Cookie, href: "/category/snacks" },
  { id: "beverages", icon: Wine, href: "/category/beverages" },
  { id: "fruits", icon: Apple, href: "/category/fruits" },
  { id: "vegetables", icon: Carrot, href: "/category/vegetables" },
  { id: "dairy", icon: Milk, href: "/category/dairy" },
  { id: "baby-care", icon: Baby, href: "/category/baby-care" },
];

function ProductMiniCard({ product, locale }: { product: Product; locale: Locale }) {
  const t = useTranslations("HomeV3");
  const discount =
    Array.from(product.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 21 + 10;
  const oldPrice = (product.price * 1.25).toFixed(2);

  return (
    <article className="group overflow-hidden rounded-md border border-[var(--green)]/15 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="relative h-32 overflow-hidden bg-[var(--footerBg)]">
        <Image src={product.image} alt={product.name[locale]} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        <span className="absolute left-2 top-2 rounded bg-[var(--green)] text-white px-2 py-1 text-xs font-bold">
          {discount}% OFF
        </span>
      </div>
      <div className="p-3">
        <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--green)] transition-colors">{product.name[locale]}</h4>
        <p className="mb-2 text-xs text-[var(--foreground)]/60">{t("productCard.freshQuality")}</p>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-black text-[var(--primary)]">{product.priceDisplay}</p>
            <p className="text-xs text-[var(--foreground)]/40 line-through">{oldPrice}</p>
          </div>
          <button className="rounded-full bg-[var(--green)] hover:bg-[var(--green)]/90 px-3 py-1.5 text-xs font-bold text-white transition-colors duration-300">
            {t("productCard.add")}
          </button>
        </div>
      </div>
    </article>
  );
}

export function HomeV3() {
  const raw = useLocale();
  const locale: Locale = raw === "ps" || raw === "fa-AF" ? raw : "en";
  const isRtl = locale !== "en";
  const t = useTranslations("HomeV3");
  const [active, setActive] = useState(0);
  const products = productData.featuredProducts as Product[];
  const featured = useMemo(() => products.slice(0, 8), [products]);
  const weekly = useMemo(() => products.slice(0, 12), [products]);

  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="bg-[var(--footerBg)] text-[var(--foreground)]">
      <section className="pt-0">
        <div className="relative overflow-hidden">
          <Image
            src={HERO_SLIDES[active].image}
            alt={t(`slides.${active}.title`)}
            width={1600}
            height={520}
            className="h-[240px] w-full object-cover sm:h-[340px] lg:h-[420px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/40" />
          <div className="absolute inset-0 flex items-center px-4 sm:px-10 lg:px-16">
            <div className="max-w-xl text-white sm:max-w-2xl">
              <span className="mb-3 inline-block rounded-full bg-[var(--green)] px-3 py-1.5 text-xs font-bold text-white sm:mb-4 sm:px-4 sm:py-2 sm:text-sm">
                {t(`slides.${active}.discount`)}
              </span>
              <h1 className="mb-3 text-xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">{t(`slides.${active}.title`)}</h1>
              <p className="mb-5 max-w-xl text-sm text-white/90 sm:text-base">{t(`slides.${active}.sub`)}</p>
              <Link href="/products" className="inline-flex items-center rounded-md bg-[var(--green)] px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--green)]/90">
                {t(`slides.${active}.cta`)}
                <ChevronRight size={18} className={`${isRtl ? "mr-2 rotate-180" : "ml-2"}`} />
              </Link>
            </div>
          </div>
          <button onClick={() => setActive((p) => (p - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className={`absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-all duration-300 hover:bg-white/30 sm:block sm:p-3 ${isRtl ? "right-2 sm:right-4" : "left-2 sm:left-4"}`}>
            {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <button onClick={() => setActive((p) => (p + 1) % HERO_SLIDES.length)} className={`absolute top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-all duration-300 hover:bg-white/30 sm:block sm:p-3 ${isRtl ? "left-2 sm:left-4" : "right-2 sm:right-4"}`}>
            {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {TOP_CATEGORIES.map((category, idx) => (
            <Link key={category.id} href={category.href} className="group rounded-md border border-[var(--green)]/15 bg-white p-2 text-center transition-all duration-300 hover:border-[var(--green)]/35 sm:p-2.5">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-[var(--green)]/10 transition-colors group-hover:bg-[var(--green)]/20">
                <category.icon className="text-[var(--green)]" size={20} />
              </div>
              <p className="text-[11px] font-semibold text-[var(--foreground)] group-hover:text-[var(--green)] transition-colors">{t(`topCategories.${idx}`)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--green)]/15 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-4 text-sm font-semibold text-[var(--foreground)]/75 sm:grid-cols-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2"><Leaf size={16} className="text-[var(--green)]" /> {t("trust.0")}</div>
          <div className="flex items-center gap-2"><Truck size={16} className="text-[var(--green)]" /> {t("trust.1")}</div>
          <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[var(--green)]" /> {t("trust.2")}</div>
          <div className="flex items-center gap-2"><BadgePercent size={16} className="text-[var(--green)]" /> {t("trust.3")}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--foreground)]">{t("featured.title")}</h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">{t("featured.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-full border border-[var(--green)]/20 p-2 text-[var(--foreground)]/65 hover:border-[var(--green)] hover:text-[var(--green)] transition-colors">
              {isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <button className="rounded-full border border-[var(--green)]/20 p-2 text-[var(--foreground)]/65 hover:border-[var(--green)] hover:text-[var(--green)] transition-colors">
              {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {featured.map((p) => (
            <ProductMiniCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-7 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <article className="group relative overflow-hidden rounded-lg border border-[var(--green)]/20 bg-[var(--yellow)]/35 p-5 text-[var(--foreground)] transition-all duration-300 hover:-translate-y-0.5">
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--green)]">{t("banners.0.eyebrow")}</p>
              <p className="mt-2 text-2xl font-black">{t("banners.0.title")}</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/75">{t("banners.0.subtitle")}</p>
            </div>
            <div className={`absolute top-4 text-6xl opacity-15 ${isRtl ? "left-4" : "right-4"}`}>🍎</div>
          </article>
          <article className="group relative overflow-hidden rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/12 p-5 text-[var(--foreground)] transition-all duration-300 hover:-translate-y-0.5">
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--green)]">{t("banners.1.eyebrow")}</p>
              <p className="mt-2 text-2xl font-black">{t("banners.1.title")}</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/75">{t("banners.1.subtitle")}</p>
            </div>
            <div className={`absolute top-4 text-6xl opacity-15 ${isRtl ? "left-4" : "right-4"}`}>🥬</div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-[var(--foreground)]">{t("weekly.title")}</h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">{t("weekly.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {weekly.map((p) => (
            <article key={`weekly-${p.id}`} className="group overflow-hidden rounded-md border border-[var(--green)]/15 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm">
              <div className="relative h-32 overflow-hidden bg-[var(--footerBg)]">
                <Image src={p.image} alt={p.name[locale]} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className={`absolute top-2 rounded bg-[var(--green)] px-2 py-1 text-[10px] font-bold text-white ${isRtl ? "left-2" : "right-2"}`}>
                  {t("weekly.hot")}
                </div>
              </div>
              <div className="p-3">
                <h4 className="mb-2 line-clamp-2 text-sm font-semibold text-[var(--foreground)]">{p.name[locale]}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-[var(--primary)]">{p.priceDisplay}</span>
                  <button className="rounded-full bg-[var(--green)] hover:bg-[var(--green)]/90 p-2 text-white transition-colors duration-300">
                    <ShoppingCart size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-[var(--foreground)]">{t("trending.title")}</h2>
        </div>
        <div className="overflow-hidden rounded-lg bg-white p-4 ring-1 ring-black/5 sm:p-6">
          <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 8).map((p) => (
              <article
                key={`trend-${p.id}`}
                className="flex min-h-[112px] min-w-0 items-center gap-2.5 overflow-hidden rounded-md border border-[#edf0e9] bg-white px-2.5 py-2.5 sm:gap-3 sm:px-3"
              >
                <div className="relative h-[90px] w-[104px] shrink-0 overflow-hidden rounded-md border border-[#eef2eb] bg-white">
                  <Image src={p.image} alt={p.name[locale]} fill className="object-cover" />
                  <span className={`absolute top-0 bg-[var(--yellow)] px-1 py-0.5 text-[9px] font-bold leading-tight text-[#2f2f2f] ${isRtl ? "right-0" : "left-0"}`}>
                    {t("trending.offBadge")}
                  </span>
                </div>
                <div className={`min-w-0 flex-1 ${isRtl ? "pl-0.5" : "pr-0.5"}`}>
                  <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--foreground)]">
                    {p.name[locale]}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-normal leading-none text-[#6f776f]">{t("trending.packLabel")}</p>
                  <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
                    <span className="text-[15px] font-bold tabular-nums leading-none text-[var(--primary)]">
                      {p.priceDisplay}
                    </span>
                    <span className="text-[11px] leading-none text-[#8d9392] line-through tabular-nums">
                      ${(p.price * 1.18).toFixed(2)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold leading-tight text-[var(--foreground)]">{t("blog.title")}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: t("blog.postTitle"), date: "15 Sep, 2023", category: t("blog.category"), image: "/images/blog-1.jpg" },
            { title: t("blog.postTitle"), date: "15 Sep, 2023", category: t("blog.category"), image: "/images/blog-2.jpg" },
            { title: t("blog.postTitle"), date: "15 Sep, 2023", category: t("blog.category"), image: "/images/blog-3.jpg" },
            { title: t("blog.postTitle"), date: "15 Sep, 2023", category: t("blog.category"), image: "/images/blog-4.jpg" },
          ].map((blog, index) => (
            <article
              key={`blog-${index}`}
              className="group overflow-hidden rounded-md border border-[var(--green)]/15 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-40 overflow-hidden bg-[var(--footerBg)]">
                <Image src={blog.image} alt={blog.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="space-y-2.5 p-3">
                <div className="flex flex-wrap items-center gap-4 text-[12px] text-[var(--foreground)]/65">
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} className="text-[var(--green)]/75" />
                    {blog.date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Store size={12} className="text-[var(--green)]/75" />
                    {blog.category}
                  </span>
                </div>
                <h3 className="line-clamp-2 text-[15px] font-bold leading-[1.2] text-[var(--foreground)]">
                  {blog.title}
                </h3>
                <button className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--green)]">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--green)]/15 text-[var(--green)]">+</span>
                  {t("blog.readDetails")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-[var(--green)]/15 bg-white p-5 shadow-[0_8px_22px_rgba(22,163,74,0.08)]">
            <h3 className="mb-4 text-2xl font-black text-[var(--foreground)]">{t("why.title")}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Truck, title: t("why.items.0.title"), desc: t("why.items.0.desc") },
                { icon: Store, title: t("why.items.1.title"), desc: t("why.items.1.desc") },
                { icon: Tag, title: t("why.items.2.title"), desc: t("why.items.2.desc") },
                { icon: ShoppingCart, title: t("why.items.3.title"), desc: t("why.items.3.desc") },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border border-[var(--green)]/15 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--green)]/12 text-[var(--green)]">
                    <item.icon size={18} />
                  </div>
                  <p className="text-sm font-bold text-[var(--foreground)]">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--foreground)]/65">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

