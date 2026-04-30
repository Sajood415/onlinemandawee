"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Apple,
  Beef,
  Croissant,
  Candy,
  Pill,
  IceCream,
  Drumstick,
  Snowflake,
  ShoppingBasket,
  CircleHelp,
  Leaf,
  Truck,
  ShieldCheck,
  BadgePercent,
  ShoppingCart,
  Star,
  Eye,
  Coffee,
  Cookie,
  Wine,
  Carrot,
  Milk,
  Baby,
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
  {
    image: "/images/hero-slide-1.jpg",
    title: {
      en: "Fresh Groceries Delivered Daily",
      ps: "تازه خوراکي توکي ورځ په ورڍ لېږدول کيږي",
      "fa-AF": "خوارکFresh تازه روزانه تحویل",
    },
    sub: {
      en: "Quality products from trusted local vendors",
      ps: "له باوري محلي پلورونکو څخه کیفیت توکي",
      "fa-AF": "محصولات باکیفیت از فروشندگان محلی معتبر",
    },
    cta: { en: "Shop Now", ps: "اوس واخلئ", "fa-AF": "همین حالا خرید کنید" },
    discount: "UP TO 40% OFF",
  },
  {
    image: "/images/hero-slide-2.jpg",
    title: {
      en: "Organic & Natural Products",
      ps: "عضوي او طبیعي محصولات",
      "fa-AF": "محصولات ارگانیک و طبیعی",
    },
    sub: {
      en: "Healthy choices for your family",
      ps: "د خپلې کورنۍ لپاره صحی انتخابونه",
      "fa-AF": "انتخاب‌های سالم برای خانواده شما",
    },
    cta: { en: "Explore", ps: "وپلټئ", "fa-AF": "کاوش" },
    discount: "SPECIAL OFFERS",
  },
  {
    image: "/images/hero-slide-3.jpg",
    title: {
      en: "Fast Delivery to Your Door",
      ps: "چارچاوی لېږد ستاسو تر دروازې",
      "fa-AF": "تحویل سریع به درب منزل شما",
    },
    sub: {
      en: "Order today, receive tomorrow",
      ps: "نن ورته کړئ، بیه راز ترلاسه کړئ",
      "fa-AF": "امروز سفارش دهید، فردا تحویل بگیرید",
    },
    cta: { en: "Order Now", ps: "اوس ورته کړئ", "fa-AF": "همین حالا سفارش دهید" },
    discount: "FREE SHIPPING",
  },
] as const;

const DEPARTMENTS = [
  { icon: Apple, en: "Breakfast & Dairy" },
  { icon: Beef, en: "Meats & Seafood" },
  { icon: Croissant, en: "Breads & Bakery" },
  { icon: Candy, en: "Chips & Snacks" },
  { icon: Pill, en: "Medical Healthcare" },
  { icon: IceCream, en: "Frozen Foods" },
  { icon: ShoppingBasket, en: "Grocery & Staples" },
  { icon: CircleHelp, en: "Other Items" },
] as const;

const TOP_CATEGORIES = [
  { id: "breakfast", name: "Breakfast", icon: Coffee, href: "/category/breakfast" },
  { id: "grocery", name: "Grocery", icon: ShoppingCart, href: "/category/grocery" },
  { id: "snacks", name: "Snacks", icon: Cookie, href: "/category/snacks" },
  { id: "beverages", name: "Beverages", icon: Wine, href: "/category/beverages" },
  { id: "fruits", name: "Fruits", icon: Apple, href: "/category/fruits" },
  { id: "vegetables", name: "Vegetables", icon: Carrot, href: "/category/vegetables" },
  { id: "dairy", name: "Dairy", icon: Milk, href: "/category/dairy" },
  { id: "baby-care", name: "Baby Care", icon: Baby, href: "/category/baby-care" },
];

function ProductMiniCard({ product, locale }: { product: Product; locale: Locale }) {
  const discount = Math.floor(Math.random() * 30) + 10;
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
        <p className="mb-2 text-xs text-[var(--foreground)]/60">Fresh Quality</p>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-black text-[var(--primary)]">{product.priceDisplay}</p>
            <p className="text-xs text-[var(--foreground)]/40 line-through">{oldPrice}</p>
          </div>
          <button className="rounded-full bg-[var(--green)] hover:bg-[var(--green)]/90 px-3 py-1.5 text-xs font-bold text-white transition-colors duration-300">
            Add
          </button>
        </div>
      </div>
    </article>
  );
}

export function V3PremiumHome() {
  const raw = useLocale();
  const locale: Locale = raw === "ps" || raw === "fa-AF" ? raw : "en";
  const [active, setActive] = useState(0);
  const products = productData.featuredProducts as Product[];
  const featured = useMemo(() => products.slice(0, 8), [products]);
  const weekly = useMemo(() => products.slice(0, 12), [products]);

  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-[var(--footerBg)] text-[var(--foreground)]">
      <section className="pt-0">
        <div className="relative overflow-hidden">
          <Image
            src={HERO_SLIDES[active].image}
            alt={HERO_SLIDES[active].title[locale]}
            width={1600}
            height={520}
            className="h-[240px] w-full object-cover sm:h-[340px] lg:h-[420px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/40" />
          <div className="absolute inset-0 flex items-center px-4 sm:px-10 lg:px-16">
            <div className="max-w-xl text-white sm:max-w-2xl">
              {HERO_SLIDES[active].discount && (
                <span className="mb-3 inline-block rounded-full bg-[var(--green)] px-3 py-1.5 text-xs font-bold text-white sm:mb-4 sm:px-4 sm:py-2 sm:text-sm">
                  {HERO_SLIDES[active].discount}
                </span>
              )}
              <h1 className="mb-3 text-xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">{HERO_SLIDES[active].title[locale]}</h1>
              <p className="mb-5 max-w-xl text-sm text-white/90 sm:text-base">{HERO_SLIDES[active].sub[locale]}</p>
              <Link href="/products" className="inline-flex items-center rounded-md bg-[var(--green)] px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-[var(--green)]/90">
                {HERO_SLIDES[active].cta[locale]}
                <ChevronRight size={18} className="ml-2" />
              </Link>
            </div>
          </div>
          <button onClick={() => setActive((p) => (p - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-all duration-300 hover:bg-white/30 sm:left-4 sm:block sm:p-3">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setActive((p) => (p + 1) % HERO_SLIDES.length)} className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-all duration-300 hover:bg-white/30 sm:right-4 sm:block sm:p-3">
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {TOP_CATEGORIES.map((category) => (
            <Link key={category.id} href={category.href} className="group rounded-md border border-[var(--green)]/15 bg-white p-2 text-center transition-all duration-300 hover:border-[var(--green)]/35 sm:p-2.5">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-[var(--green)]/10 transition-colors group-hover:bg-[var(--green)]/20">
                <category.icon className="text-[var(--green)]" size={20} />
              </div>
              <p className="text-[11px] font-semibold text-[var(--foreground)] group-hover:text-[var(--green)] transition-colors">{category.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--green)]/15 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-4 text-sm font-semibold text-[var(--foreground)]/75 sm:grid-cols-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2"><Leaf size={16} className="text-[var(--green)]" /> Organic produce</div>
          <div className="flex items-center gap-2"><Truck size={16} className="text-[var(--green)]" /> Fast delivery</div>
          <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[var(--green)]" /> Secure payment</div>
          <div className="flex items-center gap-2"><BadgePercent size={16} className="text-[var(--green)]" /> Best savings</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--foreground)]">Featured Grocery</h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">Handpicked quality items for you</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-full border border-[var(--green)]/20 p-2 text-[var(--foreground)]/65 hover:border-[var(--green)] hover:text-[var(--green)] transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button className="rounded-full border border-[var(--green)]/20 p-2 text-[var(--foreground)]/65 hover:border-[var(--green)] hover:text-[var(--green)] transition-colors">
              <ChevronRight size={16} />
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
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--green)]">Fresh Fruits Special</p>
              <p className="mt-2 text-2xl font-black">Up to 40% OFF</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/75">Seasonal favorites</p>
            </div>
            <div className="absolute right-4 top-4 text-6xl opacity-15">🍎</div>
          </article>
          <article className="group relative overflow-hidden rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/12 p-5 text-[var(--foreground)] transition-all duration-300 hover:-translate-y-0.5">
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--green)]">Organic Vegetables</p>
              <p className="mt-2 text-2xl font-black">Fresh Daily</p>
              <p className="mt-1 text-sm text-[var(--foreground)]/75">Farm to table</p>
            </div>
            <div className="absolute right-4 top-4 text-6xl opacity-15">🥬</div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-[var(--foreground)]">Weekly Best Selling Groceries</h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">Most popular products this week</p>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {weekly.map((p) => (
            <article key={`weekly-${p.id}`} className="group overflow-hidden rounded-md border border-[var(--green)]/15 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm">
              <div className="relative h-32 overflow-hidden bg-[var(--footerBg)]">
                <Image src={p.image} alt={p.name[locale]} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute right-2 top-2 rounded bg-[var(--green)] px-2 py-1 text-[10px] font-bold text-white">
                  HOT
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
          <h2 className="text-xl font-bold text-[var(--foreground)]">Top Trending Products</h2>
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
                  <span className="absolute left-0 top-0 bg-[var(--yellow)] px-1 py-0.5 text-[9px] font-bold leading-tight text-[#2f2f2f]">
                    25% Off
                  </span>
                </div>
                <div className="min-w-0 flex-1 pr-0.5">
                  <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--foreground)]">
                    {p.name[locale]}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-normal leading-none text-[#6f776f]">500g Pack</p>
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
          <h2 className="text-2xl font-extrabold leading-tight text-[var(--foreground)]">Latest Blog Post Insights</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Fusion Fixation: Fueling Your Passion for All Things Stylish", date: "15 Sep, 2023", category: "Modern Fashion", image: "/images/blog-1.jpg" },
            { title: "Fusion Fixation: Fueling Your Passion for All Things Stylish", date: "15 Sep, 2023", category: "Modern Fashion", image: "/images/blog-2.jpg" },
            { title: "Fusion Fixation: Fueling Your Passion for All Things Stylish", date: "15 Sep, 2023", category: "Modern Fashion", image: "/images/blog-3.jpg" },
            { title: "Fusion Fixation: Fueling Your Passion for All Things Stylish", date: "15 Sep, 2023", category: "Modern Fashion", image: "/images/blog-4.jpg" },
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
                  Read Details
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-[var(--green)]/15 bg-white p-5 shadow-[0_8px_22px_rgba(22,163,74,0.08)]">
            <h3 className="mb-4 text-2xl font-black text-[var(--foreground)]">Why shoppers choose Mandawee</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Truck, title: "Fast Delivery", desc: "Same-day delivery on selected items" },
                { icon: Store, title: "Verified Vendors", desc: "Trusted stores with quality standards" },
                { icon: Tag, title: "Daily Deals", desc: "Fresh promotions and limited-time offers" },
                { icon: ShoppingCart, title: "Easy Checkout", desc: "Quick cart and secure payments" },
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
