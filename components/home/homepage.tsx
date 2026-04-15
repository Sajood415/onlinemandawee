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
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  Upload,
  Users,
  Zap,
  CheckCircle2,
  Info,
  Baby,
  Cake,
  Sparkles as Spark,
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
  price: string;
  vendor: string;
  image: string;
  name: { en: string; ps: string; "fa-AF": string };
  badge: { en: string; ps: string; "fa-AF": string };
};

type Product = {
  id: string;
  name: string;
  price: string;
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
      stats: Array<{ value: string; label: string }>;
      floatingTopEyebrow: string;
      floatingTopTitle: string;
      floatingBottomEyebrow: string;
      floatingBottomTitle: string;
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

const liveAds = [
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
];

const giftPackages = [
  {
    title: "Birthday Surprise Box",
    items: "Cake, flowers, chocolates, and personalized card",
    price: "From $49.99",
    icon: Cake,
    color: "var(--primary)",
  },
  {
    title: "Anniversary Bundle",
    items: "Premium gifts, roses, and celebration items",
    price: "From $79.99",
    icon: Heart,
    color: "var(--primary)",
  },
  {
    title: "New Baby Welcome",
    items: "Essentials, toys, and keepsakes for newborns",
    price: "From $59.99",
    icon: Baby,
    color: "var(--secondary)",
  },
];

const babyGiftPackages = [
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
];

const deliveryOptions = [
  {
    icon: Package,
    title: "Pickup",
    description: "Free pickup from vendor or warehouse",
    timeframe: "Same day",
    highlight: "FREE",
  },
  {
    icon: Zap,
    title: "Express Delivery",
    description: "Vendors ship separately for fastest delivery",
    timeframe: "2-3 days",
    highlight: "~$16",
  },
  {
    icon: Truck,
    title: "Standard Delivery",
    description: "Consolidated shipping from our warehouse",
    timeframe: "5-8 days",
    highlight: "~$6",
  },
];

const trustFeatures = [
  {
    icon: ShieldCheck,
    title: "Platform-Protected Refunds",
    description: "Admin-managed dispute resolution with transparent decisions",
  },
  {
    icon: Users,
    title: "Verified Vendors",
    description: "KYC-verified sellers with quality standards",
  },
  {
    icon: Star,
    title: "Quality Guarantee",
    description: "3.99% commission ensures fair pricing for all",
  },
];

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
      badge: pickLocalized(row.badge, locale),
      price: row.price,
      vendor: row.vendor,
      image: row.image,
    }),
  );
}

export function HomePage() {
  const locale = useLocale();
  const messages = useMessages() as HomepageMessages;
  const content = messages.Homepage;
  const featuredProducts = featuredProductsForLocale(locale);

  return (
    <div
      dir={content.direction}
      className="min-h-screen bg-white text-slate-900"
    >
      <main>
        <Hero hero={content.hero} />
        <MarqueeSection />
        <LiveAdsSection />
        <Categories />
        <HowItWorksSection />
        <FeaturedProductsSection
          products={featuredProducts}
          viewAllLabel={content.featuredSection.viewAll}
          addToCartLabel={content.featuredSection.addToCart}
          eyebrow={content.featuredSection.eyebrow}
          title={content.featuredSection.title}
          description={content.featuredSection.description}
        />
        <GiftIdeasSection />
        <BabyGiftPackagesSection />
        <DeliveryOptionsSection />
        <TrustSection />
        <VendorCTASection />
      </main>
    </div>
  );
}

function MarqueeSection() {
  const partners = [
    { name: "Trusted Vendors", icon: Store, color: "var(--primary)" },
    { name: "Secure Payments", icon: ShieldCheck, color: "var(--green)" },
    { name: "Fast Delivery", icon: Truck, color: "var(--secondary)" },
    { name: "Quality Products", icon: Star, color: "var(--primary)" },
    { name: "24/7 Support", icon: Users, color: "var(--secondary)" },
    { name: "Verified Sellers", icon: CheckCircle2, color: "var(--green)" },
    { name: "Gift Wrapping", icon: Gift, color: "var(--primary)" },
    { name: "Easy Returns", icon: Package, color: "var(--secondary)" },
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

function LiveAdsSection() {
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
              Live Promotions
            </span>
          </motion.div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {liveAds.map((ad, index) => (
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
                  <span>Learn more</span>
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

function HowItWorksSection() {
  const steps = [
    {
      icon: Store,
      title: "Browse Vendors",
      description: "Explore products from verified local sellers",
    },
    {
      icon: ShoppingBag,
      title: "Add to Cart",
      description: "Combine items from multiple vendors easily",
    },
    {
      icon: Truck,
      title: "Choose Delivery",
      description: "Pickup, Express, or Standard delivery options",
    },
    {
      icon: ShieldCheck,
      title: "Safe Payment",
      description: "Secure checkout with platform protection",
    },
  ];

  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage:
              "radial-linear(circle at 25% 25%, rgba(220, 53, 69, 0.08) 0%, transparent 50%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-full h-full"
          style={{
            backgroundImage:
              "radial-linear(circle at 75% 75%, rgba(2, 55, 136, 0.06) 0%, transparent 50%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.p
            className="text-sm font-bold uppercase tracking-[0.2em] mb-3"
            style={{ color: "var(--primary)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
          >
            Simple Process
          </motion.p>
          <motion.h2
            className="text-4xl font-bold mb-4"
            style={{ color: "var(--foreground)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
          >
            How It Works
          </motion.h2>
          <motion.p
            className="text-base"
            style={{ color: "var(--foreground)", opacity: 0.6 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
          >
            From browsing to delivery, we&apos;ve made shopping from multiple
            vendors seamless
          </motion.p>
        </div>

        {/* Steps Grid with Arrows */}
        <div className="relative">
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                {/* Arrow connector */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 -right-3 z-10">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.15 + 0.3 }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ color: "var(--primary)" }}
                      >
                        <path
                          d="M9 18l6-6-6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </motion.div>
                  </div>
                )}

                {/* Card */}
                <div
                  className="rounded-2xl p-6 text-center border transition-all duration-300 hover:border-(--primary)/30 hover:shadow-lg"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderColor: "rgba(226, 232, 240, 0.8)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {/* Icon */}
                  <div className="mb-4">
                    <step.icon
                      className="h-6 w-6 mx-auto"
                      strokeWidth={1.5}
                      style={{ color: "var(--foreground)", opacity: 0.7 }}
                    />
                  </div>

                  {/* Step Number */}
                  <div className="mb-4">
                    <span
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border-2"
                      style={{
                        backgroundColor: "transparent",
                        borderColor: "var(--primary)",
                        color: "var(--primary)",
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--foreground)", opacity: 0.6 }}
                  >
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Success indicator at end */}
          <motion.div
            className="hidden md:flex absolute -right-4 top-16 items-center justify-center"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--green)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </motion.div>
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

function GiftIdeasSection() {
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
                Gift & Surprise
              </span>
            </div>
            <h2
              className="text-3xl font-bold mb-4"
              style={{ color: "var(--foreground)" }}
            >
              Make Every Occasion Special
            </h2>
            <p
              className="mb-8"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Share your gift ideas with images and videos, or choose from our
              curated collections. We'll help you create the perfect surprise.
            </p>

            <div className="space-y-4 mb-8">
              {giftPackages.map((pkg, index) => (
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

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/gifts"
                className="inline-flex h-12 items-center justify-center rounded-full px-5 sm:px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-md whitespace-nowrap"
                style={{ backgroundColor: "var(--primary)" }}
              >
                Browse Collections
              </Link>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/gifts/custom"
                  className="inline-flex h-12 items-center justify-center rounded-full px-5 sm:px-6 text-sm font-semibold text-white relative overflow-hidden w-full sm:w-auto whitespace-nowrap"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary) 0%, #E11D48 100%)",
                    boxShadow: "0 4px 15px rgba(220, 53, 69, 0.3)",
                  }}
                >
                  <motion.span
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <Upload className="mr-2 h-4 w-4 relative shrink-0" strokeWidth={1.5} />
                  <span className="relative whitespace-nowrap">Share Your Idea</span>
                </Link>
              </motion.div>
            </div>
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
                Custom Gift Builder
              </h3>
            </div>
            <p
              className="mb-6"
              style={{ color: "var(--foreground)", opacity: 0.7 }}
            >
              Upload photos, videos, or describe your perfect gift. Our team
              will curate products from multiple vendors to bring your vision to
              life.
            </p>
            <div className="space-y-3">
              {[
                "Upload images or videos of gift ideas",
                "Add personal messages and preferences",
                "Combine products from any vendor",
                "Premium wrapping and card options",
              ].map((feature, index) => (
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

function BabyGiftPackagesSection() {
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
              Baby Gift Packages
            </span>
          </div>
          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Welcome the Little Ones
          </h2>
          <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
            Curated newborn gift packages with essentials, toys, and keepsakes
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {babyGiftPackages.map((pkg, index) => (
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
              Explore All Baby Packages
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function DeliveryOptionsSection() {
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
              Delivery Options
            </span>
          </div>
          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Flexible Delivery for Every Need
          </h2>
          <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
            Choose the delivery method that works best for you
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {deliveryOptions.map((option, index) => (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="rounded-2xl border p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all cursor-pointer relative"
              style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
            >
              {option.title === "Standard Delivery" && (
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
                      Why Standard?
                    </p>
                    <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
                      Saves money by grouping items from different vendors into
                      one box
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
          Free delivery on orders over $100 • Local per-km pricing may apply
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
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
              Trust & Safety
            </span>
          </motion.div>
          <motion.h2
            className="text-4xl font-bold mb-4 tracking-tight"
            style={{ color: "var(--foreground)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
          >
            Shop with Confidence
          </motion.h2>
          <motion.p
            className="text-lg"
            style={{ color: "var(--foreground)", opacity: 0.65 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
          >
            Our platform protects every transaction with verified vendors and
            transparent dispute resolution
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {trustFeatures.map((feature, index) => (
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
                    Refund Protection
                  </h3>
                </div>
                <p
                  className="mb-8 text-base"
                  style={{ color: "var(--foreground)", opacity: 0.65 }}
                >
                  If you're not satisfied, our platform manages the refund
                  process:
                </p>
                <div className="space-y-4">
                  {[
                    "Submit return request with photos",
                    "Vendor responds within 24-48 hours",
                    "Admin reviews and decides fairly",
                    "Refund processed to original payment",
                  ].map((step, index) => (
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
                    Purchase Protection
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

function VendorCTASection() {
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
                For Vendors
              </span>
            </motion.div>
            <motion.h2
              className="text-4xl font-bold mb-5 tracking-tight"
              style={{ color: "var(--foreground)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Become a Vendor
            </motion.h2>
            <motion.p
              className="mb-10 text-lg leading-relaxed"
              style={{ color: "var(--foreground)", opacity: 0.65 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Join our marketplace and reach customers worldwide. Simple
              onboarding, transparent fees, and powerful tools to grow your
              business.
            </motion.p>

            <div className="space-y-4 mb-10">
              {[
                "Phone-verified signup with OTP security",
                "Simple store setup with custom URL",
                "KYC verification for trust and safety",
                "Flexible payout options (Bank, PayPal, Stripe)",
                "Transparent 3.99% commission rate",
                "$5.99/month membership fee",
              ].map((benefit, index) => (
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
                  Start Selling
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
                  Learn More
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
              {[
                {
                  icon: Store,
                  count: "500+",
                  label: "Active Vendors",
                  color: "var(--primary)",
                },
                {
                  icon: Users,
                  count: "50K+",
                  label: "Happy Customers",
                  color: "var(--secondary)",
                },
                {
                  icon: Package,
                  count: "100K+",
                  label: "Orders Delivered",
                  color: "var(--green)",
                },
                {
                  icon: TrendingUp,
                  count: "35%",
                  label: "Avg. Growth Rate",
                  color: "var(--primary)",
                },
              ].map((stat, index) => (
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
