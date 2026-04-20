"use client";

import Link from "next/link";
import { useLocale, useMessages } from "next-intl";
import {
  ArrowRight,
  Gift,
  Heart,
  Megaphone,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  Users,
  Zap,
  CheckCircle2,
  Info,
  Baby,
  Cake,
  ChevronRight,
  TrendingUp,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";

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
};

type Product = {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  vendor: string;
  image: string;
  badge: string;
};

type HomepageMessages = {
  Homepage: {
    direction: "ltr" | "rtl";
    hero: {
      eyebrow: string;
      title: string;
      description: string;
      primaryCta: string;
      secondaryCta: string;
    };
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

const giftPackageVisuals = [
  { icon: Cake, color: "var(--primary)" },
  { icon: Heart, color: "var(--primary)" },
  { icon: Baby, color: "var(--secondary)" },
];

const deliveryOptionIcons = [Package, Zap, Truck];
const trustFeatureIcons = [ShieldCheck, Users, Star];
const vendorStatIcons = [Store, Users, Package, TrendingUp];
const vendorStatColors = [
  "var(--primary)",
  "var(--secondary)",
  "var(--green)",
  "var(--primary)",
];

const homePageCopy: Record<
  SupportedLocale,
  {
    marqueePartners: string[];
    livePromotionsLabel: string;
    learnMoreLabel: string;
    liveAds: Array<{ label: string; title: string; description: string }>;
    giftIdeas: {
      tag: string;
      title: string;
      description: string;
      browseCta: string;
      packages: Array<{ title: string; items: string; price: string }>;
      builderTitle: string;
      builderDescription: string;
      builderFeatures: string[];
    };
    babyGift: {
      tag: string;
      title: string;
      description: string;
      exploreCta: string;
      packages: Array<{ title: string; description: string; items: string }>;
    };
    delivery: {
      tag: string;
      title: string;
      description: string;
      standardInfoTitle: string;
      standardInfoDescription: string;
      note: string;
      options: Array<{
        title: string;
        description: string;
        timeframe: string;
        highlight: string;
      }>;
    };
    trust: {
      tag: string;
      title: string;
      description: string;
      features: Array<{ title: string; description: string }>;
      refundTitle: string;
      refundDescription: string;
      refundSteps: string[];
      purchaseProtection: string;
    };
    vendor: {
      tag: string;
      title: string;
      description: string;
      benefits: string[];
      primaryCta: string;
      secondaryCta: string;
      stats: Array<{ count: string; label: string }>;
    };
  }
> = {
  en: {
    marqueePartners: [
      "Trusted Vendors",
      "Secure Payments",
      "Fast Delivery",
      "Quality Products",
      "24/7 Support",
      "Verified Sellers",
      "Gift Wrapping",
      "Easy Returns",
    ],
    livePromotionsLabel: "Live Promotions",
    learnMoreLabel: "Learn more",
    liveAds: [
      {
        label: "Limited Time",
        title: "Weekend Special: 20% Off Fresh Groceries",
        description: "Stock up on essentials from trusted local vendors",
      },
      {
        label: "New Arrival",
        title: "Premium Gift Collections Now Available",
        description: "Curated bundles for birthdays and celebrations",
      },
      {
        label: "Vendor Spotlight",
        title: "Noor Premium Gifts: Luxury Gifting",
        description: "Hand-selected items with premium wrapping",
      },
    ],
    giftIdeas: {
      tag: "Gift & Surprise",
      title: "Make Every Occasion Special",
      description:
        "Choose from our curated collections for every occasion. We'll help you create the perfect surprise for your loved ones.",
      browseCta: "Browse All Collections",
      packages: [
        {
          title: "Birthday Surprise Box",
          items: "Cake, flowers, chocolates, and personalized card",
          price: "From $49.99",
        },
        {
          title: "Anniversary Bundle",
          items: "Premium gifts, roses, and celebration items",
          price: "From $79.99",
        },
        {
          title: "New Baby Welcome",
          items: "Essentials, toys, and keepsakes for newborns",
          price: "From $59.99",
        },
      ],
      builderTitle: "Custom Gift Builder",
      builderDescription:
        "Upload photos, videos, or describe your perfect gift. Our team will curate products from multiple vendors to bring your vision to life.",
      builderFeatures: [
        "Upload images or videos of gift ideas",
        "Add personal messages and preferences",
        "Combine products from any vendor",
        "Premium wrapping and card options",
      ],
    },
    babyGift: {
      tag: "Baby Gift Packages",
      title: "Welcome the Little Ones",
      description:
        "Curated newborn gift packages with essentials, toys, and keepsakes, handpicked by our team",
      exploreCta: "Explore All Baby Packages",
      packages: [
        {
          title: "Essential Care Package",
          description: "Diapers, wipes, lotion, and baby powder",
          items: "12 items included",
        },
        {
          title: "Clothing Starter Set",
          description: "Onesies, bibs, socks, and newborn outfits",
          items: "8 items included",
        },
        {
          title: "Premium Gift Bundle",
          description: "Toys, blankets, books, and keepsake box",
          items: "15 items included",
        },
      ],
    },
    delivery: {
      tag: "Delivery Options",
      title: "Flexible Delivery for Every Need",
      description: "Choose the delivery method that works best for you",
      standardInfoTitle: "Why Standard?",
      standardInfoDescription:
        "Saves money by grouping items from different vendors into one box",
      note: "Free delivery on orders over $100 • Local per-km pricing may apply",
      options: [
        {
          title: "Pickup",
          description: "Free pickup from vendor or warehouse",
          timeframe: "Same day",
          highlight: "FREE",
        },
        {
          title: "Express Delivery",
          description: "Vendors ship separately for fastest delivery",
          timeframe: "2-3 days",
          highlight: "~$16",
        },
        {
          title: "Standard Delivery",
          description: "Consolidated shipping from our warehouse",
          timeframe: "5-8 days",
          highlight: "~$6",
        },
      ],
    },
    trust: {
      tag: "Trust & Safety",
      title: "Shop with Confidence",
      description:
        "Our platform protects every transaction with verified vendors and transparent dispute resolution",
      features: [
        {
          title: "Platform-Protected Refunds",
          description:
            "Admin-managed dispute resolution with transparent decisions",
        },
        {
          title: "Verified Vendors",
          description: "KYC-verified sellers with quality standards",
        },
        {
          title: "Quality Guarantee",
          description: "3.99% commission ensures fair pricing for all",
        },
      ],
      refundTitle: "Refund Protection",
      refundDescription:
        "If you're not satisfied, our platform manages the refund process:",
      refundSteps: [
        "Submit return request with photos",
        "Vendor responds within 24-48 hours",
        "Admin reviews and decides fairly",
        "Refund processed to original payment",
      ],
      purchaseProtection: "Purchase Protection",
    },
    vendor: {
      tag: "For Vendors",
      title: "Become a Vendor",
      description:
        "Join our marketplace and reach customers worldwide. Simple onboarding, transparent fees, and powerful tools to grow your business.",
      benefits: [
        "Phone-verified signup with OTP security",
        "Simple store setup with custom URL",
        "KYC verification for trust and safety",
        "Flexible payout options (Bank, PayPal, Stripe)",
        "Transparent 3.99% commission rate",
        "$5.99/month membership fee",
      ],
      primaryCta: "Start Selling",
      secondaryCta: "Learn More",
      stats: [
        { count: "500+", label: "Active Vendors" },
        { count: "50K+", label: "Happy Customers" },
        { count: "100K+", label: "Orders Delivered" },
        { count: "35%", label: "Avg. Growth Rate" },
      ],
    },
  },
  ps: {
    marqueePartners: [
      "باوري پلورونکي",
      "خوندي تادیات",
      "چټک تحویل",
      "کیفیته توکي",
      "24/7 مرسته",
      "تایید شوي پلورونکي",
      "د ډالۍ لفافه",
      "اسانه بیرته ستنول",
    ],
    livePromotionsLabel: "ژوندي وړاندیزونه",
    learnMoreLabel: "نور وګورئ",
    liveAds: [
      {
        label: "محدود وخت",
        title: "د اونۍ پای ځانګړی وړاندیز: پر تازه خوراکي توکو 20٪ تخفیف",
        description: "له باوري محلي پلورونکو څخه اړین توکي واخلئ",
      },
      {
        label: "نوی راغلی",
        title: "اوس پریمیم ډالۍ ټولګې موجودې دي",
        description: "د زوکړې او لمانځنو لپاره غوره شوې بستې",
      },
      {
        label: "د پلورونکي ځانګړنه",
        title: "د نور پریمیم ډالیو لوکس ټولګه",
        description: "د پریمیم لفافې سره په دقت ټاکل شوي توکي",
      },
    ],
    giftIdeas: {
      tag: "ډالۍ او حیرانتیا",
      title: "هره موقع ځانګړې کړئ",
      description:
        "د هرې موقع لپاره له زموږ له غوره ټولګو انتخاب وکړئ. موږ به ستاسو د عزیزانو لپاره مناسب حیرانتیا چمتو کړو.",
      browseCta: "ټولې ټولګې وګورئ",
      packages: [
        {
          title: "د زوکړې حیرانتیا بکس",
          items: "کېک، ګلان، چاکلېټ او شخصي کارت",
          price: "له $49.99 څخه",
        },
        {
          title: "د کلیزې بسته",
          items: "پریمیم ډالۍ، ګلابونه او د لمانځنې توکي",
          price: "له $79.99 څخه",
        },
        {
          title: "نوي ماشوم ته ښه راغلاست",
          items: "اړین توکي، لوبې او یادګاري شیان",
          price: "له $59.99 څخه",
        },
      ],
      builderTitle: "شخصي ډالۍ جوړونکی",
      builderDescription:
        "انځورونه یا ویډیوګانې پورته کړئ، یا خپله مناسبه ډالۍ تشریح کړئ. زموږ ټیم به له ګڼو پلورونکو څخه توکي یوځای کړي.",
      builderFeatures: [
        "د ډالۍ د نظرونو انځورونه یا ویډیوګانې پورته کړئ",
        "شخصي پیغامونه او خوښې اضافه کړئ",
        "له بېلابېلو پلورونکو څخه توکي یوځای کړئ",
        "پریمیم لفافه او کارت اختیارونه",
      ],
    },
    babyGift: {
      tag: "د ماشوم ډالۍ بستې",
      title: "کوچنیانو ته ښه راغلاست",
      description:
        "د نوي زېږېدلي لپاره غوره شوې بستې چې اړین توکي، لوبې او یادګارونه پکې دي",
      exploreCta: "د ماشوم ټولې بستې وګورئ",
      packages: [
        {
          title: "د پاملرنې بنسټیزه بسته",
          description: "ډایپر، وایپس، لوشن او د ماشوم پوډر",
          items: "12 توکي شامل",
        },
        {
          title: "د جامو پیل بسته",
          description: "یونسي، بب، جرابې او د نوي زېږېدلي جامې",
          items: "8 توکي شامل",
        },
        {
          title: "پریمیم ډالۍ بسته",
          description: "لوبې، کمپلې، کتابونه او یادګاري بکس",
          items: "15 توکي شامل",
        },
      ],
    },
    delivery: {
      tag: "د تحویل انتخابونه",
      title: "د هر اړتیا لپاره انعطاف منونکی تحویل",
      description: "هغه تحویلي لاره وټاکئ چې ستاسو لپاره مناسبه وي",
      standardInfoTitle: "ولې معیاري؟",
      standardInfoDescription:
        "د بېلابېلو پلورونکو توکي په یوه بکس کې راغونډوي او لګښت کموي",
      note: "پر $100 څخه پورته فرمایشونو وړیا تحویل • محلي فی-کیلومتر بیه پلي کېدای شي",
      options: [
        {
          title: "اخیستل",
          description: "له پلورونکي یا ګودام څخه وړیا اخیستل",
          timeframe: "همدا ورځ",
          highlight: "وړیا",
        },
        {
          title: "چټک تحویل",
          description: "پلورونکي بېل بېل لیږدوي څو ژر ورسیږي",
          timeframe: "2-3 ورځې",
          highlight: "~$16",
        },
        {
          title: "معیاري تحویل",
          description: "له ګودام څخه په یوځای لیږد سره",
          timeframe: "5-8 ورځې",
          highlight: "~$6",
        },
      ],
    },
    trust: {
      tag: "باور او خوندیتوب",
      title: "په ډاډه زړه پیرود وکړئ",
      description:
        "زموږ پلاتفورم هره معامله د تایید شویو پلورونکو او روښانه شخړه‌حل بهیر سره خوندي کوي",
      features: [
        {
          title: "د پلاتفورم خوندي بیرته ستنول",
          description: "د اډمین له خوا اداره کېدونکې روښانه پرېکړې",
        },
        {
          title: "تایید شوي پلورونکي",
          description: "KYC تایید شوي پلورونکي له کیفیت معیارونو سره",
        },
        {
          title: "د کیفیت تضمین",
          description: "3.99٪ کمیسیون د عادلانه بیو ډاډ ورکوي",
        },
      ],
      refundTitle: "د پیسو بېرته ستنولو خوندیتوب",
      refundDescription:
        "که راضي نه یئ، زموږ پلاتفورم د بېرته ستنولو بهیر اداره کوي:",
      refundSteps: [
        "له عکسونو سره د بېرته ستنولو غوښتنه ثبت کړئ",
        "پلورونکی په 24-48 ساعتونو کې ځواب ورکوي",
        "اډمین په عادلانه ډول ارزونه او پرېکړه کوي",
        "پیسې بېرته اصلي تادیې ته لېږل کېږي",
      ],
      purchaseProtection: "د پېرود خوندیتوب",
    },
    vendor: {
      tag: "د پلورونکو لپاره",
      title: "پلورونکی شئ",
      description:
        "زموږ مارکیټ سره یوځای شئ او نړیوالو پیرودونکو ته ورسیږئ. ساده پیل، روڼ فیسونه او د ودې قوي وسایل.",
      benefits: [
        "د OTP امنیت سره د تلیفون تایید شوی ثبت‌نام",
        "د ځانګړي URL سره ساده پلورنځي جوړول",
        "د باور لپاره KYC تایید",
        "انعطاف منونکي ورکړه اختیارونه (Bank, PayPal, Stripe)",
        "روڼ 3.99٪ کمیسیون",
        "$5.99 / میاشت غړیتوب فیس",
      ],
      primaryCta: "پلور پیل کړئ",
      secondaryCta: "نور معلومات",
      stats: [
        { count: "500+", label: "فعال پلورونکي" },
        { count: "50K+", label: "خوشاله پیرودونکي" },
        { count: "100K+", label: "تحویل شوي فرمایشونه" },
        { count: "35%", label: "منځنی د ودې کچه" },
      ],
    },
  },
  "fa-AF": {
    marqueePartners: [
      "فروشندگان معتبر",
      "پرداخت امن",
      "تحویل سریع",
      "محصولات باکیفیت",
      "پشتیبانی 24/7",
      "فروشندگان تاییدشده",
      "لفافه هدیه",
      "بازگشت آسان",
    ],
    livePromotionsLabel: "پیشنهادهای زنده",
    learnMoreLabel: "بیشتر ببینید",
    liveAds: [
      {
        label: "زمان محدود",
        title: "ویژه آخر هفته: 20٪ تخفیف روی مواد خوراکی تازه",
        description: "نیازهای اساسی را از فروشندگان محلی معتبر تهیه کنید",
      },
      {
        label: "جدید",
        title: "مجموعه‌های هدیه ممتاز اکنون موجود است",
        description: "بسته‌های منتخب برای تولدها و جشن‌ها",
      },
      {
        label: "ویترین فروشنده",
        title: "کالکشن لوکس نور پریمیم هدایا",
        description: "محصولات دست‌چین‌شده با بسته‌بندی ممتاز",
      },
    ],
    giftIdeas: {
      tag: "هدیه و سورپرایز",
      title: "هر مناسبت را خاص بسازید",
      description:
        "از مجموعه‌های منتخب ما برای هر مناسبت انتخاب کنید. ما برای عزیزان‌تان سورپرایز عالی آماده می‌کنیم.",
      browseCta: "دیدن همه مجموعه‌ها",
      packages: [
        {
          title: "جعبه سورپرایز تولد",
          items: "کیک، گل، شکلات و کارت شخصی",
          price: "از $49.99",
        },
        {
          title: "بسته سالگرد",
          items: "هدایای ممتاز، گل رز و اقلام جشن",
          price: "از $79.99",
        },
        {
          title: "خوش‌آمد نوزاد",
          items: "اقلام ضروری، اسباب‌بازی و یادگاری‌ها",
          price: "از $59.99",
        },
      ],
      builderTitle: "هدیه‌ساز سفارشی",
      builderDescription:
        "عکس یا ویدیو آپلود کنید یا هدیه دلخواه‌تان را توضیح دهید. تیم ما از چند فروشنده بهترین ترکیب را آماده می‌کند.",
      builderFeatures: [
        "آپلود عکس یا ویدیو از ایده هدیه",
        "افزودن پیام‌ها و سلیقه‌های شخصی",
        "ترکیب محصولات از فروشندگان مختلف",
        "گزینه‌های بسته‌بندی ممتاز و کارت",
      ],
    },
    babyGift: {
      tag: "بسته‌های هدیه نوزاد",
      title: "به کوچولوها خوش‌آمد بگویید",
      description:
        "بسته‌های منتخب نوزاد با اقلام ضروری، اسباب‌بازی و یادگاری که توسط تیم ما آماده شده‌اند",
      exploreCta: "مشاهده همه بسته‌های نوزاد",
      packages: [
        {
          title: "بسته مراقبت ضروری",
          description: "پوشک، دستمال، لوشن و پودر بچه",
          items: "12 قلم شامل است",
        },
        {
          title: "بسته آغاز پوشاک",
          description: "لباس نوزادی، پیشبند، جوراب و ست‌های نوزاد",
          items: "8 قلم شامل است",
        },
        {
          title: "بسته هدیه ممتاز",
          description: "اسباب‌بازی، پتوی نرم، کتاب و جعبه یادگاری",
          items: "15 قلم شامل است",
        },
      ],
    },
    delivery: {
      tag: "گزینه‌های تحویل",
      title: "تحویل انعطاف‌پذیر برای هر نیاز",
      description: "روش تحویلی را انتخاب کنید که برای شما بهتر است",
      standardInfoTitle: "چرا استاندارد؟",
      standardInfoDescription:
        "با یکجا کردن اقلام فروشندگان مختلف در یک بسته، هزینه را کم می‌کند",
      note: "تحویل رایگان برای سفارش‌های بالاتر از $100 • قیمت‌گذاری محلی بر اساس کیلومتر ممکن است اعمال شود",
      options: [
        {
          title: "دریافت حضوری",
          description: "دریافت رایگان از فروشنده یا انبار",
          timeframe: "همان روز",
          highlight: "رایگان",
        },
        {
          title: "تحویل سریع",
          description: "فروشندگان جداگانه ارسال می‌کنند تا زودتر برسد",
          timeframe: "2-3 روز",
          highlight: "~$16",
        },
        {
          title: "تحویل استاندارد",
          description: "ارسال یکجا از انبار ما",
          timeframe: "5-8 روز",
          highlight: "~$6",
        },
      ],
    },
    trust: {
      tag: "اعتماد و امنیت",
      title: "با اطمینان خرید کنید",
      description:
        "پلتفرم ما هر تراکنش را با فروشندگان تاییدشده و روند شفاف حل اختلاف محافظت می‌کند",
      features: [
        {
          title: "بازپرداخت محافظت‌شده توسط پلتفرم",
          description: "حل اختلاف توسط ادمین با تصمیم‌های شفاف",
        },
        {
          title: "فروشندگان تاییدشده",
          description: "فروشندگان تاییدشده KYC با معیارهای کیفیت",
        },
        {
          title: "تضمین کیفیت",
          description: "کمیسیون 3.99٪ قیمت‌گذاری منصفانه را تضمین می‌کند",
        },
      ],
      refundTitle: "محافظت بازپرداخت",
      refundDescription:
        "اگر راضی نبودید، پلتفرم ما روند بازپرداخت را مدیریت می‌کند:",
      refundSteps: [
        "درخواست بازگشت را همراه با عکس ثبت کنید",
        "فروشنده در 24-48 ساعت پاسخ می‌دهد",
        "ادمین منصفانه بررسی و تصمیم‌گیری می‌کند",
        "بازپرداخت به روش پرداخت اصلی انجام می‌شود",
      ],
      purchaseProtection: "محافظت خرید",
    },
    vendor: {
      tag: "برای فروشندگان",
      title: "فروشنده شوید",
      description:
        "به بازار ما بپیوندید و به مشتریان جهانی برسید. شروع ساده، هزینه‌های شفاف و ابزارهای قوی برای رشد کسب‌وکار.",
      benefits: [
        "ثبت‌نام تاییدشده با شماره موبایل و امنیت OTP",
        "راه‌اندازی ساده فروشگاه با URL اختصاصی",
        "تایید KYC برای اعتماد و امنیت",
        "گزینه‌های انعطاف‌پذیر پرداخت (Bank, PayPal, Stripe)",
        "نرخ کمیسیون شفاف 3.99٪",
        "هزینه عضویت ماهانه $5.99",
      ],
      primaryCta: "شروع فروش",
      secondaryCta: "بیشتر بدانید",
      stats: [
        { count: "500+", label: "فروشندگان فعال" },
        { count: "50K+", label: "مشتریان خوشحال" },
        { count: "100K+", label: "سفارش تحویل‌شده" },
        { count: "35%", label: "میانگین نرخ رشد" },
      ],
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
    }),
  );
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
        <FeaturedProductsSection
          products={featuredProducts}
          viewAllLabel={content.featuredSection.viewAll}
          addToCartLabel={content.featuredSection.addToCart}
          eyebrow={content.featuredSection.eyebrow}
          title={content.featuredSection.title}
          description={content.featuredSection.description}
        />
        <MarqueeSection copy={localized} />
        <LiveAdsSection copy={localized} />
        <GiftIdeasSection copy={localized} />
        <BabyGiftPackagesSection copy={localized} />
        <DeliveryOptionsSection copy={localized} />
        <TrustSection copy={localized} />
        <VendorCTASection copy={localized} />
      </main>
    </div>
  );
}

function MarqueeSection({ copy }: { copy: (typeof homePageCopy)["en"] }) {
  const partners = [
    { name: copy.marqueePartners[0], icon: Store, color: "var(--primary)" },
    { name: copy.marqueePartners[1], icon: ShieldCheck, color: "var(--green)" },
    { name: copy.marqueePartners[2], icon: Truck, color: "var(--secondary)" },
    { name: copy.marqueePartners[3], icon: Star, color: "var(--primary)" },
    { name: copy.marqueePartners[4], icon: Users, color: "var(--secondary)" },
    { name: copy.marqueePartners[5], icon: CheckCircle2, color: "var(--green)" },
    { name: copy.marqueePartners[6], icon: Gift, color: "var(--primary)" },
    { name: copy.marqueePartners[7], icon: Package, color: "var(--secondary)" },
  ];

  return (
    <section
      className="py-6 overflow-hidden relative"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Top linear line accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-linear-to-r from-transparent via-[var(--primary)] to-transparent opacity-30" />

      <div className="relative">
        {/* Enhanced linear masks */}
        <div className="absolute left-0 top-0 bottom-0 w-40 bg-linear-to-r from-white via-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-40 bg-linear-to-l from-white via-white to-transparent z-10 pointer-events-none" />

        {/* Marquee container */}
        <motion.div
          className="flex"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            x: {
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {[...partners, ...partners, ...partners].map((partner, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-3 mx-4 px-5 py-2.5 rounded-full border cursor-pointer whitespace-nowrap backdrop-blur-sm"
              style={{
                borderColor: "rgba(226, 232, 240, 0.6)",
                backgroundColor: "rgba(248, 250, 252, 0.8)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
              whileHover={{
                scale: 1.08,
                boxShadow: `0 4px 20px ${partner.color}30`,
                borderColor: partner.color,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <motion.div
                className="flex items-center justify-center rounded-full p-1.5"
                style={{ backgroundColor: `${partner.color}15` }}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <partner.icon
                  className="h-4 w-4"
                  style={{ color: partner.color }}
                  strokeWidth={1.5}
                />
              </motion.div>
              <span
                className="text-sm font-semibold tracking-tight"
                style={{ color: "var(--foreground)" }}
              >
                {partner.name}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom linear line accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-linear-to-r from-transparent via-[var(--primary)] to-transparent opacity-30" />
    </section>
  );
}

function LiveAdsSection({ copy }: { copy: (typeof homePageCopy)["en"] }) {
  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      {/* Background linear accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-linear-to-br from-[var(--primary)] to-transparent opacity-[0.03] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-linear-to-tl from-[var(--secondary)] to-transparent opacity-[0.03] rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-12 text-center">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 border backdrop-blur-sm"
            style={{
              backgroundColor: "rgba(220, 53, 69, 0.08)",
              borderColor: "rgba(220, 53, 69, 0.15)",
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: "var(--primary)",
                  opacity: 0.4,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              ></div>
              <Megaphone
                className="h-4 w-4 relative"
                style={{ color: "var(--primary)" }}
                strokeWidth={1.5}
              />
            </div>
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--primary)" }}
            >
              {copy.livePromotionsLabel}
            </span>
          </motion.div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {copy.liveAds.map((ad, index) => (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                duration: 0.5,
                delay: index * 0.1,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative rounded-2xl border bg-white p-6 backdrop-blur-sm overflow-hidden"
              style={{
                borderColor: "rgba(226, 232, 240, 0.8)",
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              {/* Hover linear overlay */}
              <div className="absolute inset-0 bg-linear-to-br from-[var(--primary)] to-[var(--secondary)] opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider border"
                    style={{
                      backgroundColor: "rgba(241, 245, 249, 0.8)",
                      borderColor: "rgba(226, 232, 240, 0.6)",
                      color: "var(--foreground)",
                    }}
                  >
                    {ad.label}
                  </span>
                  <motion.div
                    className="h-9 w-9 rounded-full flex items-center justify-center border"
                    style={{
                      backgroundColor: "rgba(220, 53, 69, 0.08)",
                      borderColor: "rgba(220, 53, 69, 0.15)",
                    }}
                    whileHover={{ scale: 1.15, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Megaphone
                      className="h-4 w-4"
                      style={{ color: "var(--primary)" }}
                      strokeWidth={1.5}
                    />
                  </motion.div>
                </div>
                <h3
                  className="text-xl font-bold mb-3 leading-tight"
                  style={{ color: "var(--foreground)" }}
                >
                  {ad.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--foreground)", opacity: 0.65 }}
                >
                  {ad.description}
                </p>

                {/* Learn more link */}
                <motion.div
                  className="mt-5 flex items-center gap-1 text-sm font-semibold cursor-pointer"
                  style={{ color: "var(--primary)" }}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <span>{copy.learnMoreLabel}</span>
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </motion.div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedProductsSection({
  products,
  viewAllLabel,
  addToCartLabel,
  eyebrow,
  title,
  description,
}: {
  products: Product[];
  viewAllLabel: string;
  addToCartLabel: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="py-20" style={{ backgroundColor: "#F8FAFC" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
        >
          <FeaturedProducts
            products={products}
            viewAllLabel={viewAllLabel}
            addToCartLabel={addToCartLabel}
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
        </motion.div>
      </div>
    </section>
  );
}

function GiftIdeasSection({ copy }: { copy: (typeof homePageCopy)["en"] }) {
  const packages = copy.giftIdeas.packages.map((pkg, index) => ({
    ...pkg,
    icon: giftPackageVisuals[index]?.icon ?? Gift,
    color: giftPackageVisuals[index]?.color ?? "var(--primary)",
  }));

  return (
    <section className="py-20" style={{ backgroundColor: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6"
              style={{ backgroundColor: "rgba(220, 53, 69, 0.1)" }}
            >
              <Gift
                className="h-4 w-4"
                style={{ color: "var(--primary)" }}
                strokeWidth={1.5}
              />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--primary)" }}
              >
                {copy.giftIdeas.tag}
              </span>
            </div>
            <h2
              className="text-3xl font-bold mb-4"
              style={{ color: "var(--foreground)" }}
            >
              {copy.giftIdeas.title}
            </h2>
            <p
              className="mb-8"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              {copy.giftIdeas.description}
            </p>

            <div className="space-y-4 mb-8">
              {packages.map((pkg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-center gap-4 rounded-xl border p-4 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
                  style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
                >
                  <motion.div
                    className="h-12 w-12 flex items-center justify-center rounded-xl bg-white shadow-sm"
                    whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <pkg.icon
                      className="h-6 w-6"
                      style={{ color: pkg.color }}
                      strokeWidth={1.5}
                    />
                  </motion.div>
                  <div className="flex-1">
                    <h3
                      className="font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {pkg.title}
                    </h3>
                    <p
                      className="text-sm"
                      style={{ color: "var(--foreground)", opacity: 0.7 }}
                    >
                      {pkg.items}
                    </p>
                  </div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: pkg.color }}
                  >
                    {pkg.price}
                  </p>
                </motion.div>
              ))}
            </div>

            <Link
              href="/gifts"
              className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-md"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {copy.giftIdeas.browseCta}
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
            className="rounded-3xl p-8 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]"
            style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Heart
                  className="h-6 w-6"
                  style={{ color: "var(--primary)" }}
                  strokeWidth={1.5}
                  fill="rgba(220, 53, 69, 0.1)"
                />
              </motion.div>
              <h3
                className="text-xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {copy.giftIdeas.builderTitle}
              </h3>
            </div>
            <p
              className="mb-6"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              {copy.giftIdeas.builderDescription}
            </p>
            <div className="space-y-3">
              {copy.giftIdeas.builderFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2
                    className="h-5 w-5"
                    style={{ color: "var(--primary)" }}
                    strokeWidth={1.5}
                  />
                  <span
                    className="text-sm"
                    style={{ color: "var(--foreground)" }}
                  >
                    {feature}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BabyGiftPackagesSection({ copy }: { copy: (typeof homePageCopy)["en"] }) {
  return (
    <section className="py-20" style={{ backgroundColor: "#F8FAFC" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6"
            style={{ backgroundColor: "rgba(2, 55, 136, 0.1)" }}
          >
            <Gift
              className="h-4 w-4"
              style={{ color: "var(--secondary)" }}
              strokeWidth={1.5}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--secondary)" }}
            >
              {copy.babyGift.tag}
            </span>
          </div>
          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            {copy.babyGift.title}
          </h2>
          <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
            {copy.babyGift.description}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {copy.babyGift.packages.map((pkg, index) => (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="rounded-2xl border bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all cursor-pointer"
              style={{ borderColor: "#E2E8F0" }}
            >
              <motion.div
                className="mb-4 h-14 w-14 flex items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: "rgba(2, 55, 136, 0.1)",
                  color: "var(--secondary)",
                }}
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Baby className="h-7 w-7" strokeWidth={1.5} />
              </motion.div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                {pkg.title}
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--foreground)", opacity: 0.7 }}
              >
                {pkg.description}
              </p>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{ backgroundColor: "rgba(2, 55, 136, 0.1)" }}
              >
                <Package
                  className="h-4 w-4"
                  style={{ color: "var(--secondary)" }}
                  strokeWidth={1.5}
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: "var(--secondary)" }}
                >
                  {pkg.items}
                </span>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/baby-gifts"
              className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-md"
              style={{ backgroundColor: "var(--secondary)" }}
            >
              {copy.babyGift.exploreCta}
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function DeliveryOptionsSection({ copy }: { copy: (typeof homePageCopy)["en"] }) {
  const options = copy.delivery.options.map((option, index) => ({
    ...option,
    icon: deliveryOptionIcons[index] ?? Truck,
  }));

  return (
    <section className="py-20" style={{ backgroundColor: "var(--background)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6"
            style={{ backgroundColor: "rgba(2, 55, 136, 0.1)" }}
          >
            <Truck
              className="h-4 w-4"
              style={{ color: "var(--secondary)" }}
              strokeWidth={1.5}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--secondary)" }}
            >
              {copy.delivery.tag}
            </span>
          </div>
          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            {copy.delivery.title}
          </h2>
          <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
            {copy.delivery.description}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {options.map((option, index) => (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="rounded-2xl border p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all cursor-pointer relative"
              style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
            >
              {index === 2 && (
                <div className="group relative">
                  <Info
                    className="h-4 w-4 absolute top-2 right-2"
                    style={{ color: "var(--secondary)", opacity: 0.5 }}
                    strokeWidth={1.5}
                  />
                  <div
                    className="absolute right-0 top-6 w-64 p-3 rounded-lg shadow-xl bg-white border text-xs hidden group-hover:block z-10"
                    style={{ borderColor: "#E2E8F0" }}
                  >
                    <p
                      className="font-semibold mb-1"
                      style={{ color: "var(--foreground)" }}
                    >
                      {copy.delivery.standardInfoTitle}
                    </p>
                    <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
                      {copy.delivery.standardInfoDescription}
                    </p>
                  </div>
                </div>
              )}
              <motion.div
                className="h-12 w-12 flex items-center justify-center rounded-xl bg-white mb-4 shadow-sm"
                whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <option.icon
                  className="h-6 w-6"
                  style={{ color: "var(--foreground)" }}
                  strokeWidth={1.5}
                />
              </motion.div>
              <div className="mb-3">
                <span
                  className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: "rgba(2, 55, 136, 0.1)",
                    color: "var(--secondary)",
                  }}
                >
                  {option.highlight}
                </span>
              </div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                {option.title}
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--foreground)", opacity: 0.7 }}
              >
                {option.description}
              </p>
              <div
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: "var(--foreground)", opacity: 0.6 }}
              >
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Zap className="h-4 w-4" strokeWidth={1.5} />
                </motion.div>
                <span>{option.timeframe}</span>
              </div>
            </motion.article>
          ))}
        </div>

        <div
          className="mt-10 text-center text-sm"
          style={{ color: "var(--foreground)", opacity: 0.6 }}
        >
          {copy.delivery.note}
        </div>
      </div>
    </section>
  );
}

function TrustSection({ copy }: { copy: (typeof homePageCopy)["en"] }) {
  const features = copy.trust.features.map((feature, index) => ({
    ...feature,
    icon: trustFeatureIcons[index] ?? ShieldCheck,
  }));

  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ backgroundColor: "#F8FAFC" }}
    >
      {/* Background decorations */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-[var(--green)] opacity-[0.03] rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-[var(--primary)] opacity-[0.02] rounded-full blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 border backdrop-blur-sm"
            style={{
              backgroundColor: "rgba(66, 132, 69, 0.08)",
              borderColor: "rgba(66, 132, 69, 0.15)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
          >
            <ShieldCheck
              className="h-4 w-4"
              style={{ color: "var(--green)" }}
              strokeWidth={1.5}
            />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--green)" }}
            >
              {copy.trust.tag}
            </span>
          </motion.div>
          <motion.h2
            className="text-4xl font-bold mb-4 tracking-tight"
            style={{ color: "var(--foreground)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
          >
            {copy.trust.title}
          </motion.h2>
          <motion.p
            className="text-lg"
            style={{ color: "var(--foreground)", opacity: 0.65 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
          >
            {copy.trust.description}
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {features.map((feature, index) => (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                duration: 0.5,
                delay: index * 0.1,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative rounded-2xl border bg-white p-6 backdrop-blur-sm overflow-hidden"
              style={{
                borderColor: "rgba(226, 232, 240, 0.8)",
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              {/* Hover linear */}
              <div className="absolute inset-0 bg-linear-to-br from-[var(--green)] to-[var(--primary)] opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500" />

              <div className="relative z-10">
                <motion.div
                  className="h-14 w-14 flex items-center justify-center rounded-2xl mb-5 border"
                  style={{
                    backgroundColor: "rgba(66, 132, 69, 0.08)",
                    borderColor: "rgba(66, 132, 69, 0.15)",
                    color: "var(--green)",
                  }}
                  whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <feature.icon className="h-7 w-7" strokeWidth={1.5} />
                </motion.div>
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--foreground)", opacity: 0.65 }}
                >
                  {feature.description}
                </p>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          className="group relative rounded-3xl border bg-white p-8 sm:p-12 backdrop-blur-sm overflow-hidden"
          style={{
            borderColor: "rgba(226, 232, 240, 0.8)",
            boxShadow:
              "0 4px 30px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          {/* Subtle linear on hover */}
          <div className="absolute inset-0 bg-linear-to-br from-[var(--green)] via-[var(--primary)] to-[var(--secondary)] opacity-0 group-hover:opacity-[0.015] transition-opacity duration-700" />

          <div className="relative z-10">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <Award
                    className="h-6 w-6"
                    style={{ color: "var(--green)" }}
                    strokeWidth={1.5}
                  />
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {copy.trust.refundTitle}
                  </h3>
                </div>
                <p
                  className="mb-8 text-base"
                  style={{ color: "var(--foreground)", opacity: 0.65 }}
                >
                  {copy.trust.refundDescription}
                </p>
                <div className="space-y-4">
                  {copy.trust.refundSteps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center gap-4 p-3 rounded-xl border hover:shadow-md transition-all"
                      style={{
                        backgroundColor: "rgba(248, 250, 252, 0.8)",
                        borderColor: "rgba(226, 232, 240, 0.6)",
                      }}
                    >
                      <div
                        className="h-8 w-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 border"
                        style={{
                          backgroundColor: "rgba(66, 132, 69, 0.1)",
                          borderColor: "rgba(66, 132, 69, 0.2)",
                          color: "var(--green)",
                        }}
                      >
                        {index + 1}
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {step}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                                    transition={{
                    duration: 0.6,
                    delay: 0.3,
                    type: "spring",
                    stiffness: 100,
                  }}
                  whileHover={{ scale: 1.05, rotate: [0, 2, -2, 0] }}
                  className="rounded-2xl p-10 text-center text-white shadow-2xl relative overflow-hidden"
                  style={{ backgroundColor: "var(--green)" }}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-linear-to-tr from-white/10 to-transparent" />

                  <motion.div
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative z-10"
                  >
                    <ShieldCheck
                      className="h-16 w-16 mx-auto mb-4"
                      strokeWidth={1.5}
                    />
                  </motion.div>
                  <p className="text-5xl font-bold relative z-10">100%</p>
                  <p className="text-base mt-2 font-medium opacity-90 relative z-10">
                    {copy.trust.purchaseProtection}
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function VendorCTASection({ copy }: { copy: (typeof homePageCopy)["en"] }) {
  const stats = copy.vendor.stats.map((stat, index) => ({
    ...stat,
    icon: vendorStatIcons[index] ?? Store,
    color: vendorStatColors[index] ?? "var(--primary)",
  }));

  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--secondary)] opacity-[0.02] rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[var(--primary)] opacity-[0.02] rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, type: "spring", stiffness: 100 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 border backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(220, 53, 69, 0.08)",
                borderColor: "rgba(220, 53, 69, 0.15)",
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles
                  className="h-4 w-4"
                  style={{ color: "var(--primary)" }}
                  strokeWidth={1.5}
                />
              </motion.div>
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--primary)" }}
              >
                {copy.vendor.tag}
              </span>
            </motion.div>
            <motion.h2
              className="text-4xl font-bold mb-5 tracking-tight"
              style={{ color: "var(--foreground)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {copy.vendor.title}
            </motion.h2>
            <motion.p
              className="mb-10 text-lg leading-relaxed"
              style={{ color: "var(--foreground)", opacity: 0.65 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {copy.vendor.description}
            </motion.p>

            <div className="space-y-4 mb-10">
              {copy.vendor.benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.08 }}
                  className="flex items-center gap-4 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="h-8 w-8 flex items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: "rgba(66, 132, 69, 0.08)",
                      borderColor: "rgba(66, 132, 69, 0.15)",
                    }}
                  >
                    <CheckCircle2
                      className="h-4 w-4"
                      style={{ color: "var(--green)" }}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {benefit}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/vendor/register"
                  className="inline-flex h-14 items-center justify-center rounded-full px-6 sm:px-8 text-sm font-bold text-white transition-all shadow-lg hover:shadow-xl w-full sm:w-auto whitespace-nowrap"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  {copy.vendor.primaryCta}
                  <ArrowRight className="ml-2 h-5 w-5 shrink-0" strokeWidth={2} />
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/vendor/learn-more"
                  className="inline-flex h-14 items-center justify-center rounded-full border-2 px-6 sm:px-8 text-sm font-bold transition-all hover:shadow-lg w-full sm:w-auto whitespace-nowrap"
                  style={{
                    borderColor: "rgba(226, 232, 240, 0.8)",
                    color: "var(--foreground)",
                    backgroundColor: "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  {copy.vendor.secondaryCta}
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
                        transition={{
              duration: 0.7,
              type: "spring",
              stiffness: 100,
              delay: 0.2,
            }}
            className="rounded-3xl p-10 backdrop-blur-sm border"
            style={{
              backgroundColor: "rgba(248, 250, 252, 0.8)",
              borderColor: "rgba(226, 232, 240, 0.8)",
              boxShadow:
                "0 4px 30px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div className="space-y-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-5 p-4 rounded-2xl border hover:shadow-md transition-all"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    borderColor: "rgba(226, 232, 240, 0.6)",
                  }}
                >
                  <motion.div
                    className="h-14 w-14 flex items-center justify-center rounded-xl border"
                    style={{
                      backgroundColor: `${stat.color}10`,
                      borderColor: `${stat.color}25`,
                      color: stat.color,
                    }}
                    whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <stat.icon className="h-7 w-7" strokeWidth={1.5} />
                  </motion.div>
                  <div>
                    <motion.p
                      className="text-3xl font-bold"
                      style={{ color: "var(--foreground)" }}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                    >
                      {stat.count}
                    </motion.p>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)", opacity: 0.7 }}
                    >
                      {stat.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

