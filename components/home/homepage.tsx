"use client";

import Link from "next/link";
import { useLocale, useMessages } from "next-intl";
import {
  ArrowRight,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Users,
  CheckCircle2,
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
        <TrustSection copy={localized} />
        <VendorCTASection copy={localized} />
      </main>
    </div>
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

