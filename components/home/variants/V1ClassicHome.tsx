"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  RefreshCw,
  BadgeCheck,
  Store,
  Star,
  Zap,
  Clock,
  Coffee,
  ShoppingBag,
  Cookie,
  Wine,
  Apple,
  Carrot,
  Baby,
  Heart,
  ChevronRight as ArrowR,
} from "lucide-react";
import productData from "@/data/product.json";

type Locale = "en" | "ps" | "fa-AF";

/* ── Carousel Slides ─────────────────────────────────────────────────────── */
const SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80",
    en: {
      eyebrow: "Fresh Arrivals",
      title: "Shop Fresh Groceries from Trusted Vendors",
      sub: "Delivered to your door — daily essentials, organic produce & more",
      cta: "Shop Now",
    },
    ps: {
      eyebrow: "تازه توکي",
      title: "له باوري پلورونکو تازه خوراکي توکي واخلئ",
      sub: "ستاسو دروازې ته رسول کیږي — ورځني اړین توکي او نور",
      cta: "اوس واخلئ",
    },
    "fa-AF": {
      eyebrow: "تازه‌واردها",
      title: "مواد خوراکی تازه از فروشندگان معتبر",
      sub: "تحویل به درب منزل — نیازهای روزانه و محصولات تازه",
      cta: "خرید کنید",
    },
  },
  {
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1600&q=80",
    en: {
      eyebrow: "Gift Season",
      title: "Curated Gift Hampers for Every Occasion",
      sub: "Premium bundles from top vendors — birthdays, weddings & more",
      cta: "Explore Gifts",
    },
    ps: {
      eyebrow: "د ډالۍ موسم",
      title: "د هرې موقع لپاره غوره شوي ډالۍ بستې",
      sub: "له غوره پلورونکو پریمیم بستې — زوکړې، واده او نور",
      cta: "ډالۍ وګورئ",
    },
    "fa-AF": {
      eyebrow: "فصل هدیه",
      title: "بسته‌های هدیه منتخب برای هر مناسبت",
      sub: "بسته‌های ویژه از فروشندگان برتر — تولد، عروسی و بیشتر",
      cta: "هدایا ببینید",
    },
  },
  {
    image:
      "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?auto=format&fit=crop&w=1600&q=80",
    en: {
      eyebrow: "Multi-Vendor Platform",
      title: "Thousands of Products from 500+ Vendors",
      sub: "One checkout, multiple sellers — the smarter way to shop",
      cta: "Browse All",
    },
    ps: {
      eyebrow: "د ګڼو پلورونکو پلاتفورم",
      title: "له ۵۰۰+ پلورونکو زرهاو محصولات",
      sub: "یو چک آوټ، ګڼ پلورونکي — د پیرود ذکي لاره",
      cta: "ټول وګورئ",
    },
    "fa-AF": {
      eyebrow: "پلتفرم چندفروشنده",
      title: "هزاران محصول از ۵۰۰+ فروشنده",
      sub: "یک پرداخت، فروشندگان متعدد — روش هوشمندتر خرید",
      cta: "همه را ببینید",
    },
  },
];

/* ── Categories ──────────────────────────────────────────────────────────── */
const CATEGORIES = [
  {
    Icon: Coffee,
    label: { en: "Breakfast", ps: "ناشته", "fa-AF": "صبحانه" },
    href: "/category/breakfast",
    bg: "#FEF3C7",
  },
  {
    Icon: ShoppingBag,
    label: { en: "Groceries", ps: "خوراکي توکي", "fa-AF": "مواد خوراکی" },
    href: "/category/grocery",
    bg: "#DCFCE7",
  },
  {
    Icon: Cookie,
    label: { en: "Snacks", ps: "سنکونه", "fa-AF": "اسنک" },
    href: "/category/snacks",
    bg: "#FEE2E2",
  },
  {
    Icon: Wine,
    label: { en: "Beverages", ps: "مشروبات", "fa-AF": "نوشیدنی" },
    href: "/category/beverages",
    bg: "#EDE9FE",
  },
  {
    Icon: Apple,
    label: { en: "Fruits", ps: "مېوې", "fa-AF": "میوه" },
    href: "/category/fruits",
    bg: "#D1FAE5",
  },
  {
    Icon: Carrot,
    label: { en: "Vegetables", ps: "سبزیجات", "fa-AF": "سبزیجات" },
    href: "/category/vegetables",
    bg: "#FEF9C3",
  },
  {
    Icon: Baby,
    label: {
      en: "Baby Care",
      ps: "د ماشوم پاملرنه",
      "fa-AF": "مراقبت نوزاد",
    },
    href: "/category/baby-care",
    bg: "#FCE7F3",
  },
  {
    Icon: Heart,
    label: {
      en: "Personal Care",
      ps: "شخصي پاملرنه",
      "fa-AF": "مراقبت شخصی",
    },
    href: "/category/personal-care",
    bg: "#E0F2FE",
  },
];

/* ── Copy ────────────────────────────────────────────────────────────────── */
const COPY: Record<
  Locale,
  {
    trust: string[];
    flashDeals: string;
    endsIn: string;
    addToCart: string;
    topProducts: string;
    viewAll: string;
    sellTitle: string;
    sellSub: string;
    sellCta: string;
    stat1: string;
    stat2: string;
    stat3: string;
    promoOne: string;
    promoTwo: string;
    shopNow: string;
    categories: string;
  }
> = {
  en: {
    trust: [
      "Free Delivery",
      "Secure Payment",
      "Easy Returns",
      "Verified Vendors",
    ],
    flashDeals: "Flash Deals",
    endsIn: "Ends in",
    addToCart: "Add to Cart",
    topProducts: "Top Products",
    viewAll: "View All",
    sellTitle: "Start Selling on Mandawee",
    sellSub: "Join 500+ vendors. 3.99% commission. Easy setup.",
    sellCta: "Become a Vendor",
    stat1: "500+ Active Vendors",
    stat2: "50K+ Happy Customers",
    stat3: "100K+ Orders Delivered",
    promoOne: "Shop Fresh Groceries",
    promoTwo: "Explore Gift Collections",
    shopNow: "Shop Now",
    categories: "Shop by Category",
  },
  ps: {
    trust: [
      "وړیا ترسیم",
      "خوندي تادیه",
      "اسانه بیرته ستنول",
      "تایید شوي پلورونکي",
    ],
    flashDeals: "فلش وړاندیزونه",
    endsIn: "پای ته رسیږي",
    addToCart: "کارت ته اضافه کړئ",
    topProducts: "غوره محصولات",
    viewAll: "ټول وګورئ",
    sellTitle: "پر منډوي پلور پیل کړئ",
    sellSub: "له ۵۰۰+ پلورونکو سره یوځای شئ. ۳.۹۹٪ کمیسیون.",
    sellCta: "پلورونکی شئ",
    stat1: "۵۰۰+ فعال پلورونکي",
    stat2: "۵۰ زره+ خوشحاله پیرودونکي",
    stat3: "۱۰۰ زره+ تحویل شوي فرمایشونه",
    promoOne: "تازه خوراکي توکي واخلئ",
    promoTwo: "د ډالۍ ټولګې وګورئ",
    shopNow: "اوس واخلئ",
    categories: "د کټګورۍ له مخې واخلئ",
  },
  "fa-AF": {
    trust: [
      "تحویل رایگان",
      "پرداخت امن",
      "بازگشت آسان",
      "فروشندگان تاییدشده",
    ],
    flashDeals: "فروش فوری",
    endsIn: "پایان در",
    addToCart: "افزودن به سبد",
    topProducts: "محصولات برتر",
    viewAll: "دیدن همه",
    sellTitle: "فروش در مندوی را شروع کنید",
    sellSub: "به ۵۰۰+ فروشنده بپیوندید. کمیسیون ۳.۹۹٪.",
    sellCta: "فروشنده شوید",
    stat1: "۵۰۰+ فروشنده فعال",
    stat2: "۵۰ هزار+ مشتری راضی",
    stat3: "۱۰۰ هزار+ سفارش تحویل‌شده",
    promoOne: "مواد خوراکی تازه بخرید",
    promoTwo: "مجموعه‌های هدیه را کاوش کنید",
    shopNow: "همین حالا بخرید",
    categories: "خرید بر اساس دسته‌بندی",
  },
};

/* ── Component ───────────────────────────────────────────────────────────── */
export function V1ClassicHome() {
  const raw = useLocale();
  const locale: Locale = raw === "ps" || raw === "fa-AF" ? raw : "en";
  const c = COPY[locale];
  const products = productData.featuredProducts;

  /* Carousel */
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = useCallback(
    () => setSlide((s) => (s + 1) % SLIDES.length),
    []
  );
  const prev = useCallback(
    () => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length),
    []
  );
  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 4200);
    return () => clearInterval(id);
  }, [paused, next]);

  /* Countdown */
  const [time, setTime] = useState({ h: 5, m: 42, s: 30 });
  useEffect(() => {
    const id = setInterval(
      () =>
        setTime((t) => {
          if (t.s > 0) return { ...t, s: t.s - 1 };
          if (t.m > 0) return { ...t, m: t.m - 1, s: 59 };
          if (t.h > 0) return { h: t.h - 1, m: 59, s: 59 };
          return { h: 5, m: 42, s: 30 };
        }),
      1000
    );
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");

  const isRtl = locale !== "en";

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      {/* ── HERO CAROUSEL ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ height: "clamp(280px, 48vh, 520px)" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: i === slide ? 1 : 0,
              zIndex: i === slide ? 1 : 0,
            }}
          >
            <Image
              src={s.image}
              alt={s[locale].title}
              fill
              className="object-cover"
              priority={i === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 z-10 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
              <span
                className="mb-3 inline-block w-fit rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {s[locale].eyebrow}
              </span>
              <h1 className="max-w-xl text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-5xl">
                {s[locale].title}
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/80 sm:text-base">
                {s[locale].sub}
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {s[locale].cta}
                <ArrowR size={16} />
              </Link>
            </div>
          </div>
        ))}

        {/* Arrows */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2.5 text-white transition-colors hover:bg-black/60"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={next}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2.5 text-white transition-colors hover:bg-black/60"
        >
          <ChevronRight size={20} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-2 rounded-full transition-all ${i === slide ? "w-6 bg-white" : "w-2 bg-white/50"}`}
            />
          ))}
        </div>
      </section>

      {/* ── TRUST STRIP ───────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--foreground)" }} className="py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([Truck, ShieldCheck, RefreshCw, BadgeCheck] as const).map(
              (Icon, i) => (
                <div key={i} className="flex items-center gap-3 justify-center sm:justify-start">
                  <Icon size={18} className="shrink-0 text-white" />
                  <span className="text-sm font-semibold text-white">
                    {c.trust[i]}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── CATEGORY GRID ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[var(--foreground)]">
            {c.categories}
          </h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--primary)" }}
          >
            {c.viewAll} <ArrowR size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: cat.bg }}
              >
                <cat.Icon size={22} style={{ color: "var(--foreground)" }} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--foreground)] leading-tight">
                {cat.label[locale]}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FLASH DEALS ───────────────────────────────────────────────── */}
      <section className="bg-[var(--footerBg)] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap
                size={20}
                style={{ color: "var(--primary)", fill: "var(--primary)" }}
              />
              <h2 className="text-xl font-extrabold text-[var(--foreground)]">
                {c.flashDeals}
              </h2>
            </div>
            <div
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Clock size={13} />
              <span>
                {c.endsIn}: {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
              </span>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar">
            {products.map((p) => (
              <div
                key={p.id}
                className="min-w-[190px] flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="relative h-40">
                  <Image
                    src={p.image}
                    alt={p.name[locale]}
                    fill
                    className="object-cover"
                  />
                  <span
                    className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-white"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {p.badge[locale]}
                  </span>
                </div>
                <div className="p-3">
                  <p
                    className="text-[10px] font-semibold uppercase"
                    style={{ color: "var(--secondary)" }}
                  >
                    {p.vendor}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[var(--foreground)]">
                    {p.name[locale]}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span
                      className="font-extrabold text-sm"
                      style={{ color: "var(--primary)" }}
                    >
                      {p.priceDisplay}
                    </span>
                    <button
                      className="rounded-full px-3 py-1 text-[11px] font-bold text-white shrink-0"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      {c.addToCart}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS GRID ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
            {c.topProducts}
          </h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--primary)" }}
          >
            {c.viewAll} <ArrowR size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-44">
                <Image
                  src={p.image}
                  alt={p.name[locale]}
                  fill
                  className="object-cover"
                />
                <span
                  className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  {p.vendor.split(" ")[0]}
                </span>
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                  {p.name[locale]}
                </h3>
                <div className="mt-1 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={11}
                      style={{
                        color: "var(--yellow)",
                        fill:
                          star <= Math.round(p.rating)
                            ? "var(--yellow)"
                            : "none",
                      }}
                    />
                  ))}
                  <span className="ml-1 text-[10px] text-gray-500">
                    ({p.reviews})
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-extrabold text-sm text-[var(--foreground)]">
                    {p.priceDisplay}
                  </span>
                  <button
                    className="rounded-full px-3 py-1 text-[11px] font-bold text-white transition-all hover:brightness-110 shrink-0"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {c.addToCart}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── VENDOR SPOTLIGHT BANNER ───────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--primary)" }} className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                {c.sellTitle}
              </h2>
              <p className="mt-2 text-sm text-white/80">{c.sellSub}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-6 sm:justify-start">
                {[c.stat1, c.stat2, c.stat3].map((stat) => (
                  <div key={stat} className="flex items-center gap-2">
                    <Store size={15} className="text-white/70" />
                    <span className="text-sm font-bold text-white">{stat}</span>
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/vendor/register"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-extrabold shadow-lg transition-all hover:brightness-105 active:scale-95"
              style={{ color: "var(--primary)" }}
            >
              <Store size={18} />
              {c.sellCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── PROMOTIONAL BANNERS ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative h-52 overflow-hidden rounded-2xl">
            <Image
              src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=800&q=80"
              alt={c.promoOne}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6">
              <h3 className="text-lg font-extrabold text-white">{c.promoOne}</h3>
              <Link
                href="/category/grocery"
                className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-white/90 hover:text-white"
              >
                {c.shopNow} <ArrowR size={14} />
              </Link>
            </div>
          </div>
          <div className="relative h-52 overflow-hidden rounded-2xl">
            <Image
              src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80"
              alt={c.promoTwo}
              fill
              className="object-cover"
            />
            <div
              className="absolute inset-0 flex flex-col justify-end p-6"
              style={{
                background:
                  "linear-gradient(to top, rgba(220,53,69,0.88), rgba(0,0,0,0.1))",
              }}
            >
              <h3 className="text-lg font-extrabold text-white">{c.promoTwo}</h3>
              <Link
                href="/gifts"
                className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-white/90 hover:text-white"
              >
                {c.shopNow} <ArrowR size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
