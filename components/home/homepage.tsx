"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useMessages } from "next-intl";
import {
  ArrowRight,
  Sparkles,
  Star,
  Store,
  BadgePercent,
  MapPin,
  ShoppingBag,
  Gift,
  Baby,
  HeartHandshake,
} from "lucide-react";

import productCatalog from "@/data/product.json";
import Categories from "./Categories";
import FeaturedProducts from "./FeaturedProducts";
import Hero from "./Hero";

type FeaturedProductSource = {
  id: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  name: { en: string; ps: string; "fa-AF": string };
  badge: { en: string; ps: string; "fa-AF": string };
  category: string;
  rating: number;
  reviews: number;
  delivery: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  badge: string;
  category: string;
  rating: number;
  reviews: number;
  delivery: string;
};

type HomepageMessages = {
  Homepage: {
    direction: "ltr" | "rtl";
    featuredSection: {
      eyebrow: string;
      title: string;
      description: string;
      viewAll: string;
      addToCart: string;
    };
  };
};

type SupportedLocale = "en" | "ps" | "fa-AF";

const shelfIcons = {
  groceries: ShoppingBag,
  gifts: Gift,
  baby: Baby,
  flowers: Sparkles,
} as const;

const vendorTranslations = {
  "Noor Premium Gifts": { ps: "نور پریمیم ډالۍ", "fa-AF": "نور پریمیم هدایا" },
  "Bloom Avenue": { ps: "بلوم ایونیو", "fa-AF": "بلوم اونیو" },
  "Mandawee Market": { ps: "منډوي مارکیټ", "fa-AF": "بازار منداوی" },
  "Cocoa Stories": { ps: "کوکو کیسې", "fa-AF": "داستان‌های کاکائو" },
  "Fresh Farm Co": { ps: "فریش فارم شرکت", "fa-AF": "شرکت فارم تازه" },
  "Desert Delights": { ps: "صحرایي خوندونه", "fa-AF": "خوشی‌های صحرا" },
  "Tiny Tots Store": { ps: "ټایني ټاټس پلورنځی", "fa-AF": "فروشگاه تینی ټاتس" },
} as const;

const homePageCopy: Record<
  SupportedLocale,
  {
    highlights: Array<{ title: string; value: string }>;
    deals: {
      eyebrow: string;
      title: string;
      description: string;
      cta: string;
    };
    departments: {
      title: string;
      cta: string;
      panels: Array<{ title: string; subtitle: string }>;
    };
    arrivals: {
      title: string;
      description: string;
      tabs: string[];
    };
    vendors: {
      eyebrow: string;
      title: string;
      description: string;
      visitStore: string;
      products: string;
      rating: string;
    };
    promos: Array<{ title: string; description: string; cta: string }>;
    featureBanner: {
      eyebrow: string;
      title: string;
      description: string;
      cta: string;
    };
    shelves: {
      eyebrow: string;
      title: string;
      description: string;
      cta: string;
    };
    topRated: {
      title: string;
      description: string;
    };
    trust: {
      title: string;
      points: string[];
    };
    newsletter: {
      title: string;
      description: string;
      primaryCta: string;
      secondaryCta: string;
    };
    ui: {
      add: string;
      departments: string;
      curatedPicks: string;
      popularRightNow: string;
      trustLayer: string;
      marketplaceUpdate: string;
      sameDay: string;
      daysTwoToThree: string;
    };
  }
> = {
  en: {
    highlights: [
      { title: "Fast Delivery", value: "Same day in key cities" },
      { title: "Verified Vendors", value: "200+ trusted stores" },
      { title: "Buyer Protection", value: "Secure checkout on every order" },
      { title: "Fresh Drops", value: "New deals every 6 hours" },
    ],
    deals: {
      eyebrow: "Best Deals",
      title: "Fresh markdowns worth checking first",
      description:
        "Start with the highest-converting products on the marketplace, then keep browsing by department.",
      cta: "View all deals",
    },
    departments: {
      title: "Shop the departments customers browse first",
      cta: "View all",
      panels: [
        { title: "Your favorite departments", subtitle: "Everyday picks from the most active vendor aisles." },
        { title: "Major savings", subtitle: "Sharper markdowns across pantry, baby, and gifting." },
        { title: "Must-see deals", subtitle: "Fast-moving picks worth surfacing higher on the page." },
      ],
    },
    arrivals: {
      title: "New Arrivals",
      description: "Compact, shoppable rows keep the page moving like a real marketplace.",
      tabs: ["Top 20", "Baby", "Grocery", "Gifts", "All"],
    },
    vendors: {
      eyebrow: "Top Vendors",
      title: "Shop stores customers come back to",
      description:
        "A stronger multi-vendor experience starts with recognizable sellers, clear specialties, and fast store discovery.",
      visitStore: "Visit Store",
      products: "products",
      rating: "store rating",
    },
    promos: [
      {
        title: "Weekend Pantry Reset",
        description: "Stock up on essentials with sharper prices from top grocery vendors.",
        cta: "Shop pantry",
      },
      {
        title: "Gift-ready picks",
        description: "Curated hampers, flowers, and sweet boxes for last-minute occasions.",
        cta: "Browse gifts",
      },
      {
        title: "Care essentials",
        description: "Daily baby and personal care picks with dependable delivery windows.",
        cta: "See essentials",
      },
    ],
    featureBanner: {
      eyebrow: "Starting from $29",
      title: "Fresh picks from trusted multi-vendor shelves",
      description: "Mix groceries, gifting, and care essentials in a homepage flow that feels active and useful.",
      cta: "Shop now",
    },
    shelves: {
      eyebrow: "More to Explore",
      title: "Browse by department, not just one featured grid",
      description:
        "This version leans into the real shopping rhythm: discover, compare, and add from multiple shelves.",
      cta: "Explore category",
    },
    topRated: {
      title: "Top-rated products",
      description: "High-confidence products with strong reviews and repeat purchase energy.",
    },
    trust: {
      title: "Why shoppers stay with Mandawee",
      points: [
        "Transparent vendor ratings and reviews",
        "Reliable fulfillment windows across key categories",
        "Platform-backed support when an order needs help",
      ],
    },
    newsletter: {
      title: "Get weekly deals, vendor drops, and fresh arrivals first",
      description:
        "A tighter marketplace homepage still needs one final conversion moment. Keep this section focused and useful.",
      primaryCta: "Start shopping",
      secondaryCta: "Become a vendor",
    },
    ui: {
      add: "Add",
      departments: "departments",
      curatedPicks: "curated picks",
      popularRightNow: "Popular Right Now",
      trustLayer: "Trust Layer",
      marketplaceUpdate: "Marketplace Update",
      sameDay: "Same Day",
      daysTwoToThree: "Days 2-3",
    },
  },
  ps: {
    highlights: [
      { title: "چټک تحویل", value: "په مهمو ښارونو کې هماغه ورځ" },
      { title: "تایید شوي پلورونکي", value: "200+ باوري پلورنځي" },
      { title: "د پېرود خوندیتوب", value: "په هر فرمایش کې خوندي تادیه" },
      { title: "نوې وړاندیزونه", value: "هر 6 ساعتونو کې تازه ډیلونه" },
    ],
    deals: {
      eyebrow: "غوره ډیلونه",
      title: "هغه تخفیفونه چې باید لومړی یې وګورئ",
      description:
        "له تر ټولو پیاوړو پلورل کېدونکو توکو څخه پیل وکړئ، بیا د څانګو له لارې نور هم وپلټئ.",
      cta: "ټول ډیلونه",
    },
    departments: {
      title: "هغه څانګې وپلټئ چې خلک تر ټولو ډېر ګوري",
      cta: "ټول وګورئ",
      panels: [
        { title: "ستاسو خوښې څانګې", subtitle: "ورځني انتخابونه له تر ټولو فعاله پلورونکو څخه." },
        { title: "ستر سپما", subtitle: "په پینټري، ماشوم، او ډالیو کې ښه تخفیفونه." },
        { title: "هغه ډیلونه چې باید ووینئ", subtitle: "چټک پلورل کېدونکي توکي چې باید پورته ښکاره شي." },
      ],
    },
    arrivals: {
      title: "نوي راغلي",
      description: "لنډ او د پېرود وړ قطارونه پاڼه د حقیقي مارکیټ په شان روانه ساتي.",
      tabs: ["غوره 20", "ماشوم", "خوراکي", "ډالۍ", "ټول"],
    },
    vendors: {
      eyebrow: "غوره پلورونکي",
      title: "له هغو پلورنځیو واخلئ چې خلک بیا راګرځي",
      description:
        "قوي څو-پلورونکي تجربه د پېژندل شوو پلورونکو، روښانه ځانګړتیاوو، او چټک پلورنځي موندلو سره پیلېږي.",
      visitStore: "پلورنځی وګورئ",
      products: "توکي",
      rating: "د پلورنځي درجه",
    },
    promos: [
      {
        title: "د اونۍ پای پینټري",
        description: "له غوره خوراکي پلورونکو څخه اساسي توکي په ښه بیه واخلئ.",
        cta: "پینټري وګورئ",
      },
      {
        title: "د ډالۍ لپاره چمتو",
        description: "د وروستیو شېبو لپاره غوره شوي هیمپرونه، ګلان او خوږ توکي.",
        cta: "ډالۍ وګورئ",
      },
      {
        title: "د پاملرنې اړتیاوې",
        description: "د ماشوم او شخصي پاملرنې ورځني انتخابونه له باوري تحویل سره.",
        cta: "ضروري توکي",
      },
    ],
    featureBanner: {
      eyebrow: "له $29 څخه",
      title: "له باوري څو-پلورونکو څانګو څخه تازه انتخابونه",
      description: "خوراکي، ډالۍ، او د پاملرنې اړتیاوې په داسې پاڼه کې یوځای کړئ چې فعاله او ګټوره ښکاري.",
      cta: "اوس یې واخلئ",
    },
    shelves: {
      eyebrow: "نور هم وپلټئ",
      title: "یوازې په یوه ګریډ بسنه مه کوئ، د څانګو له لارې وپلټئ",
      description:
        "دا نسخه د ریښتیني پېرودلو بهیر ته نږدې ده: ومومئ، پرتله کړئ، او له څو څانګو څخه واخلئ.",
      cta: "کټګوري وپلټئ",
    },
    topRated: {
      title: "لوړه درجه لرونکي توکي",
      description: "هغه توکي چې قوي بیاکتنې او د بیا پېرودلو انرژي لري.",
    },
    trust: {
      title: "ولې پیرودونکي له منډوي سره پاتې کېږي",
      points: [
        "روښانه د پلورونکي درجې او بیاکتنې",
        "په مهمو کټګوریو کې باوري تحویلي وختونه",
        "کله چې فرمایش مرستې ته اړتیا ولري، د پلاتفورم ملاتړ",
      ],
    },
    newsletter: {
      title: "اونیز ډیلونه، نوي پلورونکي، او تازه راتګونه لومړی ترلاسه کړئ",
      description:
        "د بازار موندنې پاڼه باید په پای کې هم یو پیاوړی بدلون ولري، خو دا برخه ګټوره او لنډه وساتئ.",
      primaryCta: "پېرود پیل کړئ",
      secondaryCta: "پلورونکی شئ",
    },
    ui: {
      add: "اضافه",
      departments: "څانګې",
      curatedPicks: "غوره انتخابونه",
      popularRightNow: "همدا اوس مشهور",
      trustLayer: "د باور پوړ",
      marketplaceUpdate: "د مارکېټ تازه معلومات",
      sameDay: "هماغه ورځ",
      daysTwoToThree: "۲-۳ ورځې",
    },
  },
  "fa-AF": {
    highlights: [
      { title: "تحویل سریع", value: "در شهرهای مهم همان روز" },
      { title: "فروشندگان تاییدشده", value: "200+ فروشگاه قابل اعتماد" },
      { title: "محافظت خرید", value: "پرداخت امن در هر سفارش" },
      { title: "پیشنهادهای تازه", value: "هر 6 ساعت دیل‌های جدید" },
    ],
    deals: {
      eyebrow: "بهترین دیل‌ها",
      title: "تخفیف‌هایی که اول باید ببینید",
      description:
        "از قوی‌ترین محصولات بازار شروع کنید و بعد از طریق دپارتمان‌ها بیشتر جستجو کنید.",
      cta: "همه دیل‌ها",
    },
    departments: {
      title: "دپارتمان‌هایی را ببینید که مشتریان اول سراغ آن‌ها می‌روند",
      cta: "دیدن همه",
      panels: [
        { title: "دپارتمان‌های محبوب شما", subtitle: "انتخاب‌های روزمره از فعال‌ترین راهروهای فروشندگان." },
        { title: "صرفه‌جویی بزرگ", subtitle: "تخفیف‌های بهتر در انباری، کودک، و هدایا." },
        { title: "دیل‌های دیدنی", subtitle: "محصولات سریع‌فروش که باید بالاتر در صفحه دیده شوند." },
      ],
    },
    arrivals: {
      title: "محصولات تازه رسیده",
      description: "ردیف‌های فشرده و قابل خرید، صفحه را شبیه یک بازار واقعی نگه می‌دارند.",
      tabs: ["20 برتر", "نوزاد", "خواربار", "هدایا", "همه"],
    },
    vendors: {
      eyebrow: "فروشندگان برتر",
      title: "از فروشگاه‌هایی خرید کنید که مشتریان دوباره برمی‌گردند",
      description:
        "تجربه قوی چندفروشنده با فروشندگان شناخته‌شده، تخصص روشن، و کشف سریع فروشگاه شروع می‌شود.",
      visitStore: "دیدن فروشگاه",
      products: "محصول",
      rating: "امتیاز فروشگاه",
    },
    promos: [
      {
        title: "بازسازی انباری آخر هفته",
        description: "مواد ضروری را با قیمت بهتر از فروشندگان برتر مواد غذایی تهیه کنید.",
        cta: "خرید انباری",
      },
      {
        title: "آماده هدیه",
        description: "سبدها، گل‌ها و جعبه‌های شیرینی برای مناسبت‌های لحظه آخری.",
        cta: "مشاهده هدایا",
      },
      {
        title: "ضروریات مراقبت",
        description: "انتخاب‌های روزانه مراقبت کودک و شخصی با بازه تحویل قابل اعتماد.",
        cta: "دیدن ضروریات",
      },
    ],
    featureBanner: {
      eyebrow: "از $29",
      title: "انتخاب‌های تازه از شلف‌های چندفروشنده قابل اعتماد",
      description: "خواربار، هدایا، و ضروریات مراقبت را در یک جریان صفحه مفید و زنده ترکیب کنید.",
      cta: "همین حالا خرید کنید",
    },
    shelves: {
      eyebrow: "بیشتر کشف کنید",
      title: "فقط به یک گرید اکتفا نکنید، بر اساس دپارتمان خرید کنید",
      description:
        "این نسخه به ریتم واقعی خرید نزدیک‌تر است: کشف کنید، مقایسه کنید، و از چندین شلف خرید کنید.",
      cta: "کشف دسته‌بندی",
    },
    topRated: {
      title: "محصولات با بالاترین امتیاز",
      description: "محصولات قابل اعتماد با بررسی‌های قوی و حس خرید دوباره.",
    },
    trust: {
      title: "چرا خریداران با منداوی می‌مانند",
      points: [
        "امتیازها و بررسی‌های شفاف فروشنده",
        "بازه‌های تحویل قابل اعتماد در دسته‌های مهم",
        "پشتیبانی پلتفرم وقتی سفارشی نیاز به کمک دارد",
      ],
    },
    newsletter: {
      title: "دیل‌های هفتگی، فروشندگان جدید، و محصولات تازه را اول دریافت کنید",
      description:
        "این صفحه بازار باید در پایان هم یک نقطه تبدیل خوب داشته باشد، اما این بخش باید کوتاه و مفید بماند.",
      primaryCta: "شروع خرید",
      secondaryCta: "فروشنده شوید",
    },
    ui: {
      add: "افزودن",
      departments: "دپارتمان",
      curatedPicks: "گزینش برتر",
      popularRightNow: "همین حالا محبوب",
      trustLayer: "لایه اعتماد",
      marketplaceUpdate: "به‌روزرسانی بازار",
      sameDay: "همان روز",
      daysTwoToThree: "۲-۳ روز",
    },
  },
};

function pickLocalized(
  field: FeaturedProductSource["name"] | FeaturedProductSource["badge"],
  locale: string,
) {
  if (locale === "en" || locale === "ps" || locale === "fa-AF") {
    return field[locale];
  }
  return field.en;
}

function featuredProductsForLocale(locale: string): Product[] {
  return (productCatalog.featuredProducts as FeaturedProductSource[]).map(
    (row) => ({
      id: row.id,
      name: pickLocalized(row.name, locale),
      price: row.price,
      priceDisplay: row.priceDisplay,
      vendor: row.vendor,
      image: row.image,
      badge: pickLocalized(row.badge, locale),
      category: row.category,
      rating: row.rating,
      reviews: row.reviews,
      delivery: row.delivery,
    }),
  );
}

function localizeVendor(vendor: string, locale: SupportedLocale) {
  if (locale === "en") return vendor;
  return vendorTranslations[vendor as keyof typeof vendorTranslations]?.[locale] ?? vendor;
}

function localizeDelivery(
  delivery: string,
  copy: (typeof homePageCopy)["en"],
) {
  const normalized = delivery.trim().toLowerCase();
  if (normalized === "same day") return copy.ui.sameDay;
  if (normalized === "days 2-3") return copy.ui.daysTwoToThree;
  return delivery;
}

function getCategoryLabel(categoryId: string, locale: SupportedLocale) {
  const categories = productCatalog.categories as Array<{
    id: string;
    label: { en: string; ps: string; "fa-AF": string };
  }>;
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return categoryId;
  return category.label[locale];
}

export function HomePage() {
  const locale = useLocale();
  const messages = useMessages() as HomepageMessages;
  const content = messages.Homepage;
  const featuredProducts = featuredProductsForLocale(locale);
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const localized = homePageCopy[safeLocale];

  return (
    <div
      dir={content.direction}
      className="min-h-screen bg-white text-slate-900"
    >
      <main>
        <Hero />
        <Categories />
        <CompactProductShelfSection
          title={localized.arrivals.title}
          description={localized.arrivals.description}
          tabs={localized.arrivals.tabs}
          products={featuredProducts.slice(0, 4)}
          locale={safeLocale}
          copy={localized}
        />
        <DealsSpotlightSection
          products={featuredProducts.slice(0, 4)}
          copy={localized}
          locale={safeLocale}
        />
        <FeatureBannerWideSection copy={localized} />
        <VendorShowcaseSection products={featuredProducts} copy={localized} locale={safeLocale} />
        <PromoBannerSection copy={localized} locale={safeLocale} />
        <CategoryShelvesSection
          products={featuredProducts}
          viewAllLabel={content.featuredSection.viewAll}
          addToCartLabel={content.featuredSection.addToCart}
          copy={localized}
          locale={safeLocale}
        />
        <CompactProductShelfSection
          title={localized.topRated.title}
          description={localized.topRated.description}
          tabs={localized.arrivals.tabs}
          products={[...featuredProducts].sort((a, b) => b.rating - a.rating).slice(0, 4)}
          locale={safeLocale}
          copy={localized}
        />
        <TrustSection copy={localized} />
        <NewsletterSection copy={localized} />
      </main>
    </div>
  );
}

function CompactProductShelfSection({
  title,
  description,
  tabs,
  products,
  locale,
  copy,
}: {
  title: string;
  description: string;
  tabs: string[];
  products: Product[];
  locale: SupportedLocale;
  copy: (typeof homePageCopy)["en"];
}) {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab, index) => (
              <span
                key={tab}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${index === 0 ? "bg-[var(--secondary)]/10 text-[var(--secondary)]" : "bg-slate-100 text-slate-500"}`}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300"
            >
              <div className="relative mb-4 h-48 overflow-hidden rounded-lg bg-slate-50">
                <Image src={product.image} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 25vw" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">
                <bdi dir="ltr">{localizeVendor(product.vendor, locale)}</bdi>
              </p>
              <h3 className="mt-2 line-clamp-2 text-base font-bold text-slate-950">{product.name}</h3>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <Star className="h-4 w-4 fill-[var(--yellow)] text-[var(--yellow)]" />
                <span>{product.rating.toFixed(1)}</span>
                <span>({product.reviews})</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold text-[var(--primary)]">${product.price.toFixed(2)}</p>
                  <p className="text-xs text-slate-400">{localizeDelivery(product.delivery, copy)}</p>
                </div>
                <span className="rounded-md border border-[var(--primary)]/15 bg-[var(--primary)]/6 px-3 py-2 text-xs font-bold text-[var(--primary)]">
                  {copy.ui.add}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function DealsSpotlightSection({
  products,
  copy,
  locale,
}: {
  products: Product[];
  copy: (typeof homePageCopy)["en"];
  locale: SupportedLocale;
}) {
  const isRtl = locale !== "en";
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-md bg-[var(--primary)]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
              <BadgePercent className="h-3.5 w-3.5" />
              {copy.deals.eyebrow}
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {copy.deals.title}
            </h2>
            <p className="mt-3 text-base text-slate-600">{copy.deals.description}</p>
          </div>
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-[var(--primary)]"
          >
            {copy.deals.cta}
            <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {products.map((product, index) => {
            const discounted = Math.round(product.price * 0.82 * 100) / 100;
            const percentOff = Math.round(((product.price - discounted) / product.price) * 100);

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 transition hover:border-slate-300"
              >
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover transition duration-500 hover:scale-105"
                  />
                  <div className="absolute left-3 top-3 rounded-md bg-[var(--primary)] px-3 py-1 text-xs font-bold text-white">
                    -{percentOff}%
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span>{getCategoryLabel(product.category, locale)}</span>
                    <span>{localizeDelivery(product.delivery, copy)}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--secondary)]">
                      <bdi dir="ltr">{localizeVendor(product.vendor, locale)}</bdi>
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-lg font-bold text-slate-950">
                      {product.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Star className="h-4 w-4 fill-[var(--yellow)] text-[var(--yellow)]" />
                    <span>{product.rating.toFixed(1)}</span>
                    <span>({product.reviews})</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xl font-bold text-[var(--primary)]">
                        ${discounted.toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-400 line-through">
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-md bg-[var(--primary)]/10 px-3 py-2 text-xs font-bold text-[var(--primary)]">
                      #{index + 1}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureBannerWideSection({
  copy,
}: {
  copy: (typeof homePageCopy)["en"];
}) {
  return (
    <section className="bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
            <p className="inline-flex w-fit items-center rounded-md bg-[var(--secondary)]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--secondary)]">
              {copy.featureBanner.eyebrow}
            </p>
            <h2 className="mt-5 max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {copy.featureBanner.title}
            </h2>
            <p className="mt-4 max-w-lg text-base text-slate-600">
              {copy.featureBanner.description}
            </p>
            <Link
              href="/products"
              className="mt-7 inline-flex h-12 w-fit items-center justify-center rounded-md bg-[var(--primary)] px-6 text-sm font-bold text-white transition hover:brightness-110"
            >
              {copy.featureBanner.cta}
            </Link>
          </div>
          <div className="relative min-h-[260px] bg-[linear-gradient(135deg,rgba(232,25,44,0.1),rgba(15,52,96,0.08))]">
            <Image
              src="/images/carousals/slide-1.jpg"
              alt={copy.featureBanner.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}


function VendorShowcaseSection({
  products,
  copy,
  locale,
}: {
  products: Product[];
  copy: (typeof homePageCopy)["en"];
  locale: SupportedLocale;
}) {
  const isRtl = locale !== "en";
  const vendorMap = new Map<
    string,
    { vendor: string; items: Product[]; categories: Set<string>; rating: number }
  >();

  products.forEach((product) => {
    const entry = vendorMap.get(product.vendor) ?? {
      vendor: product.vendor,
      items: [],
      categories: new Set<string>(),
      rating: 0,
    };
    entry.items.push(product);
    entry.categories.add(product.category);
    entry.rating = Math.max(entry.rating, product.rating);
    vendorMap.set(product.vendor, entry);
  });

  const vendors = Array.from(vendorMap.values()).sort((a, b) => b.rating - a.rating);

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-md bg-[var(--secondary)]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--secondary)]">
            <Store className="h-3.5 w-3.5" />
            {copy.vendors.eyebrow}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {copy.vendors.title}
          </h2>
          <p className="mt-3 text-lg text-slate-600">{copy.vendors.description}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {vendors.map((vendor) => {
            const heroProduct = vendor.items[0];
            return (
            <article
              key={vendor.vendor}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-slate-300"
            >
              <div className="relative h-40 overflow-hidden bg-slate-100">
                <Image
                  src={heroProduct?.image ?? "/images/carousals/slide-1.jpg"}
                  alt={vendor.vendor}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/15 to-transparent" />
                <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg bg-white/92 text-base font-black text-[var(--secondary)]">
                  {vendor.vendor.charAt(0)}
                </div>
                <div className="absolute right-4 top-4 flex items-center gap-1 rounded-md bg-white/92 px-3 py-1 text-xs font-semibold text-slate-800">
                  <Star className="h-3.5 w-3.5 fill-[var(--yellow)] text-[var(--yellow)]" />
                  {vendor.rating.toFixed(1)}
                </div>
                <div className="absolute bottom-4 left-4 rounded-md bg-white/92 px-3 py-1 text-xs font-semibold text-slate-700">
                  {vendor.items.length} {copy.vendors.products}
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    <bdi dir="ltr">{localizeVendor(vendor.vendor, locale)}</bdi>
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {Array.from(vendor.categories)
                      .map((category) => getCategoryLabel(category, locale))
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                  <span>{Array.from(vendor.categories).length} {copy.ui.departments}</span>
                  <span>{copy.vendors.rating}: {vendor.rating.toFixed(1)}</span>
                </div>
                <Link
                  href={`/products?vendor=${encodeURIComponent(vendor.vendor)}`}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--primary)]/15 bg-[var(--primary)]/6 px-4 py-2 text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white"
                >
                  {copy.vendors.visitStore}
                  <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                </Link>
              </div>
            </article>
          )})}
        </div>
      </div>
    </section>
  );
}

function PromoBannerSection({
  copy,
  locale,
}: {
  copy: (typeof homePageCopy)["en"];
  locale: SupportedLocale;
}) {
  const isRtl = locale !== "en";
  return (
    <section className="bg-slate-50 py-10">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid gap-0 lg:grid-cols-[1fr_0.95fr]">
            <div className="p-8 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                {copy.ui.popularRightNow}
              </p>
              <h3 className="mt-3 text-3xl font-bold leading-tight text-slate-950">
                {copy.promos[0]?.title}
              </h3>
              <p className="mt-4 max-w-xl text-base text-slate-600">
                {copy.promos[0]?.description}
              </p>
              <Link
                href="/products"
                className="mt-7 inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-110"
              >
                {copy.promos[0]?.cta}
                <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
            </div>
            <div className="relative min-h-[240px] bg-slate-100">
              <Image
                src="/images/carousals/slide-5.jpg"
                alt={copy.promos[0]?.title ?? ""}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        </article>

        <div className="grid gap-5">
          {copy.promos.slice(1).map((promo, index) => (
            <article
              key={promo.title}
              className="rounded-lg border border-slate-200 bg-white p-6"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                {copy.ui.curatedPicks}
              </p>
              <h3 className="mt-3 text-2xl font-bold leading-tight text-slate-950">
                {promo.title}
              </h3>
              <p className="mt-3 text-sm text-slate-600">{promo.description}</p>
              <Link
                href="/products"
                className={`mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition ${
                  index === 0
                    ? "bg-[var(--secondary)]/10 text-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-white"
                    : "bg-[var(--green)]/12 text-[var(--green)] hover:bg-[var(--green)] hover:text-white"
                }`}
              >
                {promo.cta}
                <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryShelvesSection({
  products,
  viewAllLabel,
  addToCartLabel,
  copy,
  locale,
}: {
  products: Product[];
  viewAllLabel: string;
  addToCartLabel: string;
  copy: (typeof homePageCopy)["en"];
  locale: SupportedLocale;
}) {
  const isRtl = locale !== "en";
  const shelves = ["groceries", "gifts", "baby"].map((category) => ({
    id: category,
    products: products.filter((product) => product.category === category).slice(0, 4),
  }));

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {copy.shelves.title}
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate-600">{copy.shelves.description}</p>
        </div>

        {shelves.slice(0, 2).map((shelf) => {
          const Icon = shelfIcons[shelf.id as keyof typeof shelfIcons] ?? ShoppingBag;
          return (
            <div key={shelf.id} className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-[var(--primary)]">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-950">
                      {getCategoryLabel(shelf.id, locale)}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {shelf.products.length} {copy.ui.curatedPicks}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/products?category=${shelf.id}`}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] transition hover:text-[var(--secondary)]"
                >
                  {copy.shelves.cta}
                  <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                </Link>
              </div>

              <FeaturedProducts
                products={shelf.products}
                viewAllLabel={viewAllLabel}
                addToCartLabel={addToCartLabel}
                eyebrow={getCategoryLabel(shelf.id, locale)}
                title={getCategoryLabel(shelf.id, locale)}
                description=""
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TrustSection({ copy }: { copy: (typeof homePageCopy)["en"] }) {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr] lg:items-center">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-md bg-[var(--green)]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--green)]">
              <HeartHandshake className="h-3.5 w-3.5" />
              {copy.ui.trustLayer}
            </p>
            <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              {copy.trust.title}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.trust.points.map((point) => (
              <div
                key={point}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700"
              >
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NewsletterSection({ copy }: { copy: (typeof homePageCopy)["en"] }) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--foreground),var(--secondary))] px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                <MapPin className="h-3.5 w-3.5" />
                {copy.ui.marketplaceUpdate}
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {copy.newsletter.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base text-white/70">
                {copy.newsletter.description}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/products"
                className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--primary)] px-6 text-sm font-bold text-white transition hover:brightness-110"
              >
                {copy.newsletter.primaryCta}
              </Link>
              <Link
                href="/vendor/register"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/15"
              >
                {copy.newsletter.secondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
