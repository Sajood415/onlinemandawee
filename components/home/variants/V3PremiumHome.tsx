"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocale } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowR,
  Store,
  Star,
  Mail,
} from "lucide-react";
import productData from "@/data/product.json";

type Locale = "en" | "ps" | "fa-AF";

/* ── Hero Slides ─────────────────────────────────────────────────────────── */
const SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?auto=format&fit=crop&w=1600&q=80",
    en: {
      eyebrow: "Welcome to Mandawee",
      title: "Your Premium Multi-Vendor Marketplace",
      sub: "Quality products from verified Afghan vendors, delivered with care",
      cta: "Explore Now",
    },
    ps: {
      eyebrow: "منډوي ته ښه راغلاست",
      title: "ستاسو پریمیم د ګڼو پلورونکو بازار",
      sub: "له تایید شوو افغان پلورونکو کیفیت لرونکي محصولات، د پاملرنې سره رسول",
      cta: "اوس وګورئ",
    },
    "fa-AF": {
      eyebrow: "به مندوی خوش آمدید",
      title: "بازار چندفروشنده ممتاز شما",
      sub: "محصولات باکیفیت از فروشندگان معتبر افغان، تحویل با دقت",
      cta: "همین حالا کاوش کنید",
    },
  },
  {
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1600&q=80",
    en: {
      eyebrow: "Curated Collections",
      title: "Discover Premium Afghan Dates & Dry Fruits",
      sub: "Sourced directly from trusted farmers — pure, natural, fresh",
      cta: "Shop Collection",
    },
    ps: {
      eyebrow: "غوره ټولګه",
      title: "پریمیم افغان خرما او وچې مېوې وګورئ",
      sub: "مستقیم له باوري کرنکارو — خالص، طبیعي، تازه",
      cta: "ټولګه واخلئ",
    },
    "fa-AF": {
      eyebrow: "کالکشن منتخب",
      title: "خرما و میوه خشک ممتاز افغانستان را کشف کنید",
      sub: "مستقیم از کشاورزان معتبر — خالص، طبیعی، تازه",
      cta: "مجموعه را ببینید",
    },
  },
  {
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1600&q=80",
    en: {
      eyebrow: "Gifting Made Easy",
      title: "Thoughtfully Curated Hampers & Bouquets",
      sub: "Celebrate every milestone with premium gifts delivered same day",
      cta: "Browse Gifts",
    },
    ps: {
      eyebrow: "ډالۍ اسانه کیږي",
      title: "دقیقه ډول غوره بستې او ګلان",
      sub: "همدا ورځ د تحویل سره د هرې شیبې لمانځل",
      cta: "ډالۍ وګورئ",
    },
    "fa-AF": {
      eyebrow: "هدیه دادن آسان شد",
      title: "بسته‌ها و دسته‌گل‌های منتخب متفکرانه",
      sub: "هر مایلستون را با هدایای ویژه تحویل همان روز جشن بگیرید",
      cta: "هدایا را ببینید",
    },
  },
];

/* ── Category Image Cards ─────────────────────────────────────────────────── */
const CAT_CARDS = [
  {
    label: { en: "Fresh Groceries", ps: "تازه خوراکي", "fa-AF": "مواد خوراکی تازه" },
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
    href: "/category/grocery",
  },
  {
    label: { en: "Gift Hampers", ps: "ډالۍ بستې", "fa-AF": "بسته‌های هدیه" },
    image:
      "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=600&q=80",
    href: "/gifts",
  },
  {
    label: { en: "Fresh Flowers", ps: "تازه ګلان", "fa-AF": "گل‌های تازه" },
    image:
      "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80",
    href: "/category/flowers",
  },
  {
    label: { en: "Baby & Care", ps: "د ماشوم پاملرنه", "fa-AF": "مراقبت نوزاد" },
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80",
    href: "/category/baby-care",
  },
  {
    label: { en: "Snacks & Sweets", ps: "سنکونه او خوږ", "fa-AF": "اسنک و شیرینی" },
    image:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=600&q=80",
    href: "/category/snacks",
  },
  {
    label: { en: "Personal Care", ps: "شخصي پاملرنه", "fa-AF": "مراقبت شخصی" },
    image:
      "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?auto=format&fit=crop&w=600&q=80",
    href: "/category/personal-care",
  },
];

/* ── Vendor Marquee Pills ─────────────────────────────────────────────────── */
const VENDOR_PILLS = [
  "Noor Premium Gifts",
  "Bloom Avenue",
  "Harvest Market",
  "Little Steps",
  "Kabul Spice House",
  "Afghan Organics",
  "Pure Valley Farms",
  "Sweet Moments",
  "Mandawee Essentials",
  "Green Leaf Co.",
];

/* ── Featured Vendors ─────────────────────────────────────────────────────── */
const FEATURED_VENDORS = [
  {
    name: "Noor Premium Gifts",
    tag: { en: "Gift Specialist", ps: "د ډالۍ متخصص", "fa-AF": "متخصص هدیه" },
    items: 48,
    image:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Harvest Market",
    tag: { en: "Organic Groceries", ps: "طبیعي خوراکي", "fa-AF": "مواد ارگانیک" },
    items: 67,
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Bloom Avenue",
    tag: { en: "Flowers & Bouquets", ps: "ګلان او ګېډۍ", "fa-AF": "گل و دسته‌گل" },
    items: 32,
    image:
      "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80",
  },
];

/* ── Copy ────────────────────────────────────────────────────────────────── */
const COPY: Record<
  Locale,
  {
    shopByCategory: string;
    viewAll: string;
    todayDeals: string;
    editorPicks: string;
    ourVendors: string;
    vendorPartners: string;
    visitStore: string;
    items: string;
    splitLeft: string;
    splitLeftSub: string;
    splitLeftCta: string;
    splitRight: string;
    splitRightSub: string;
    splitRightCta: string;
    newsletterTitle: string;
    newsletterSub: string;
    newsletterPlaceholder: string;
    subscribe: string;
    addToCart: string;
    deal: string;
  }
> = {
  en: {
    shopByCategory: "Shop by Category",
    viewAll: "View All",
    todayDeals: "Today's Best Deals",
    editorPicks: "Editor's Picks",
    ourVendors: "Our Vendors",
    vendorPartners: "Trusted vendor partners",
    visitStore: "Visit Store",
    items: "items",
    splitLeft: "Sell on Mandawee",
    splitLeftSub:
      "Join our growing community of 500+ vendors. Simple setup, low commission.",
    splitLeftCta: "Become a Vendor",
    splitRight: "Same Day Delivery",
    splitRightSub:
      "Order before 2pm and receive your items the same day, anywhere in Kabul.",
    splitRightCta: "Learn More",
    newsletterTitle: "Get the Best Deals in Your Inbox",
    newsletterSub:
      "Weekly drops, exclusive offers and new vendor alerts. No spam, ever.",
    newsletterPlaceholder: "your@email.com",
    subscribe: "Subscribe",
    addToCart: "Add to Cart",
    deal: "Deal",
  },
  ps: {
    shopByCategory: "د کټګورۍ له مخې واخلئ",
    viewAll: "ټول وګورئ",
    todayDeals: "د نن ورځې غوره وړاندیزونه",
    editorPicks: "د ایډیټر انتخابونه",
    ourVendors: "زموږ پلورونکي",
    vendorPartners: "باوري پلورونکي شریکان",
    visitStore: "پلازمینه وګورئ",
    items: "توکي",
    splitLeft: "پر منډوي پلور وکړئ",
    splitLeftSub:
      "له ۵۰۰+ پلورونکو لرونکي زموږ روزافزونه ټولنې سره یوځای شئ. اسان تنظیم، کم کمیسیون.",
    splitLeftCta: "پلورونکی شئ",
    splitRight: "همدا ورځ تحویل",
    splitRightSub:
      "د غرمې ۲ بجو دمخه آرډر ورکړئ او همدا ورځ کابل کې د توکو تحویل ترلاسه کړئ.",
    splitRightCta: "نور معلومات",
    newsletterTitle: "غوره وړاندیزونه ستاسو بریښنالیک ته ترلاسه کړئ",
    newsletterSub:
      "اونیز تازه توکي، ځانګړي وړاندیزونه. بې سپامه.",
    newsletterPlaceholder: "your@email.com",
    subscribe: "سبسکرایب",
    addToCart: "کارت ته اضافه کړئ",
    deal: "وړاندیز",
  },
  "fa-AF": {
    shopByCategory: "خرید بر اساس دسته‌بندی",
    viewAll: "دیدن همه",
    todayDeals: "بهترین پیشنهادهای امروز",
    editorPicks: "انتخاب‌های سردبیر",
    ourVendors: "فروشندگان ما",
    vendorPartners: "شرکای فروشنده معتبر",
    visitStore: "بازدید از فروشگاه",
    items: "آیتم",
    splitLeft: "در مندوی بفروشید",
    splitLeftSub:
      "به جامعه رو به رشد ۵۰۰+ فروشنده ما بپیوندید. راه‌اندازی ساده، کمیسیون کم.",
    splitLeftCta: "فروشنده شوید",
    splitRight: "تحویل همان روز",
    splitRightSub:
      "قبل از ساعت ۲ بعدازظهر سفارش دهید و همان روز اجناس خود را در کابل دریافت کنید.",
    splitRightCta: "بیشتر بدانید",
    newsletterTitle: "بهترین پیشنهادها را در صندوق پستی خود دریافت کنید",
    newsletterSub:
      "به‌روزرسانی هفتگی، پیشنهادات ویژه. بدون اسپم.",
    newsletterPlaceholder: "your@email.com",
    subscribe: "اشتراک",
    addToCart: "افزودن به سبد",
    deal: "تخفیف",
  },
};

/* ── Component ───────────────────────────────────────────────────────────── */
export function V3PremiumHome() {
  const raw = useLocale();
  const locale: Locale = raw === "ps" || raw === "fa-AF" ? raw : "en";
  const c = COPY[locale];
  const products = productData.featuredProducts;
  const isRtl = locale !== "en";

  /* Hero */
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
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, next]);

  /* Newsletter */
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const marqueeRef = useRef<HTMLDivElement>(null);

  /* Marquee animation pause on hover */
  const [marqueeHovered, setMarqueeHovered] = useState(false);

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      {/* ── HERO CAROUSEL ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ height: "clamp(300px, 52vh, 560px)" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
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
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(2,55,136,0.85) 0%, rgba(2,55,136,0.3) 50%, transparent 100%)",
              }}
            />
            <div className="absolute bottom-20 left-0 right-0 z-10 px-8 sm:px-16 lg:px-24">
              <span
                className="mb-3 inline-block rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {s[locale].eyebrow}
              </span>
              <h1 className="max-w-2xl text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-5xl">
                {s[locale].title}
              </h1>
              <p className="mt-3 max-w-lg text-sm text-white/80 sm:text-base">
                {s[locale].sub}
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold shadow-lg transition-all hover:bg-gray-50 active:scale-95"
                style={{ color: "var(--secondary)" }}
              >
                {s[locale].cta} <ArrowR size={16} />
              </Link>
            </div>
          </div>
        ))}

        {/* Arrows */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-2.5 text-white transition-colors"
          style={{ backgroundColor: "rgba(2,55,136,0.5)" }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={next}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-2.5 text-white transition-colors"
          style={{ backgroundColor: "rgba(2,55,136,0.5)" }}
        >
          <ChevronRight size={20} />
        </button>

        {/* Floating category chips — overlap bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center gap-2 px-4 pb-0 translate-y-1/2">
          {CAT_CARDS.slice(0, 4).map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="hidden sm:flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-[var(--foreground)] shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <span>{cat.label[locale]}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* spacer for the floating chips */}
      <div className="hidden sm:block h-8" />

      {/* ── SHOP BY CATEGORY ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
            {c.shopByCategory}
          </h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--secondary)" }}
          >
            {c.viewAll} <ArrowR size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CAT_CARDS.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative h-40 overflow-hidden rounded-2xl shadow-sm"
            >
              <Image
                src={cat.image}
                alt={cat.label[locale]}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute bottom-3 left-0 right-0 px-3 text-center text-sm font-extrabold text-white">
                {cat.label[locale]}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TODAY'S BEST DEALS ────────────────────────────────────────── */}
      <section
        className="py-10"
        style={{ backgroundColor: "var(--footerBg)" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-[var(--foreground)]">
              {c.todayDeals}
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-1 text-sm font-semibold"
              style={{ color: "var(--secondary)" }}
            >
              {c.viewAll} <ArrowR size={14} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar">
            {products.map((p) => (
              <div
                key={p.id}
                className="min-w-[200px] flex-shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="relative h-44">
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
                    {c.deal}
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
                      style={{ color: "var(--secondary)" }}
                    >
                      {p.priceDisplay}
                    </span>
                    <button
                      className="rounded-full px-3 py-1 text-[11px] font-bold text-white shrink-0"
                      style={{ backgroundColor: "var(--secondary)" }}
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

      {/* ── EDITOR'S PICKS ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
            {c.editorPicks}
          </h2>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--secondary)" }}
          >
            {c.viewAll} <ArrowR size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md"
            >
              <div className="relative h-44">
                <Image
                  src={p.image}
                  alt={p.name[locale]}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: "var(--secondary)" }}
                >
                  {p.vendor}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
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
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-extrabold text-sm text-[var(--foreground)]">
                    {p.priceDisplay}
                  </span>
                  <button
                    className="rounded-full px-3 py-1 text-[11px] font-bold text-white shrink-0"
                    style={{ backgroundColor: "var(--secondary)" }}
                  >
                    {c.addToCart}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── VENDOR BRANDS (Marquee + 3 featured) ─────────────────────── */}
      <section
        className="py-12"
        style={{ backgroundColor: "var(--footerBg)" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--foreground)]">
                {c.ourVendors}
              </h2>
              <p className="text-sm text-gray-500">{c.vendorPartners}</p>
            </div>
          </div>

          {/* Marquee */}
          <div
            className="relative overflow-hidden py-3"
            onMouseEnter={() => setMarqueeHovered(true)}
            onMouseLeave={() => setMarqueeHovered(false)}
          >
            <div
              ref={marqueeRef}
              className="flex gap-3 w-max"
              style={{
                animation: marqueeHovered
                  ? "none"
                  : "marquee 25s linear infinite",
              }}
            >
              {[...VENDOR_PILLS, ...VENDOR_PILLS].map((name, i) => (
                <span
                  key={i}
                  className="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold text-[var(--foreground)] bg-white"
                  style={{ borderColor: "var(--secondary)" }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Featured vendor cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {FEATURED_VENDORS.map((v) => (
              <div
                key={v.name}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="relative h-32">
                  <Image
                    src={v.image}
                    alt={v.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
                <div className="p-4">
                  <p className="font-bold text-[var(--foreground)]">{v.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{v.tag[locale]}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--secondary)" }}
                    >
                      {v.items} {c.items}
                    </span>
                    <Link
                      href="/products"
                      className="text-xs font-semibold"
                      style={{ color: "var(--secondary)" }}
                    >
                      {c.visitStore} →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPLIT PROMO BANNERS ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Left – navy */}
          <div
            className="flex flex-col justify-between rounded-2xl p-8 min-h-52"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <div>
              <Store size={28} className="text-white/60 mb-3" />
              <h3 className="text-xl font-extrabold text-white">
                {c.splitLeft}
              </h3>
              <p className="mt-2 text-sm text-white/70 max-w-xs">
                {c.splitLeftSub}
              </p>
            </div>
            <Link
              href="/vendor/register"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold transition-all hover:bg-gray-100"
              style={{ color: "var(--secondary)" }}
            >
              {c.splitLeftCta} <ArrowR size={14} />
            </Link>
          </div>

          {/* Right – white with navy border */}
          <div
            className="flex flex-col justify-between rounded-2xl border-2 p-8 min-h-52"
            style={{ borderColor: "var(--secondary)" }}
          >
            <div>
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-white text-lg"
                style={{ backgroundColor: "var(--secondary)" }}
              >
                ⚡
              </div>
              <h3
                className="text-xl font-extrabold"
                style={{ color: "var(--secondary)" }}
              >
                {c.splitRight}
              </h3>
              <p className="mt-2 text-sm text-gray-500 max-w-xs">
                {c.splitRightSub}
              </p>
            </div>
            <Link
              href="/delivery"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all"
              style={{ backgroundColor: "var(--secondary)" }}
            >
              {c.splitRightCta} <ArrowR size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER STRIP ──────────────────────────────────────────── */}
      <section
        className="py-16"
        style={{ backgroundColor: "var(--secondary)" }}
      >
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <Mail size={28} className="mx-auto mb-4 text-white/60" />
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            {c.newsletterTitle}
          </h2>
          <p className="mt-3 text-sm text-white/70">{c.newsletterSub}</p>
          {subscribed ? (
            <p className="mt-6 rounded-full bg-white/20 px-8 py-4 text-sm font-bold text-white inline-block">
              ✓ Subscribed!
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSubscribed(true);
              }}
              className="mx-auto mt-6 flex max-w-md overflow-hidden rounded-full bg-white shadow-lg"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={c.newsletterPlaceholder}
                className="flex-1 bg-transparent px-5 py-4 text-sm text-[var(--foreground)] outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="m-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {c.subscribe}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Marquee keyframe */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
