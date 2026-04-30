"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/store/auth-context";
import { useCart } from "@/store/cart-context";
import Link from "next/link";
import {
  Search,
  MapPin,
  ShoppingBasket,
  ChevronDown,
  Menu,
  X,
  Cookie,
  HelpCircle,
  Sparkles,
  Zap,
  ArrowRight,
  Croissant,
  ShoppingBag,
  Wine,
  Cherry,
  Carrot,
  GlassWater,
  SprayCanIcon,
  Baby,
  Heart,
  Dumbbell,
  PenTool,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import productData from "@/data/product.json";

// --- Framer Motion Configuration ---
const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: { opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.15 } },
};

const sheetVariants: Variants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring", damping: 30, stiffness: 300 },
  },
  exit: {
    x: "100%",
    transition: { type: "spring", damping: 30, stiffness: 300 },
  },
};

type SupportedLocale = "en" | "ps" | "fa-AF";

const vendorTranslations = {
  "Noor Premium Gifts": { ps: "نور پریمیم ډالۍ", "fa-AF": "نور پریمیم هدایا" },
  "Bloom Avenue": { ps: "بلوم ایونیو", "fa-AF": "بلوم اونیو" },
  "Mandawee Market": { ps: "منډوي مارکیټ", "fa-AF": "بازار منداوی" },
  "Cocoa Stories": { ps: "کوکو کیسې", "fa-AF": "داستان‌های کاکائو" },
  "Fresh Farm Co": { ps: "فریش فارم شرکت", "fa-AF": "شرکت فارم تازه" },
  "Desert Delights": { ps: "صحرايي خوندونه", "fa-AF": "خوشی‌های صحرا" },
  "Tiny Tots Store": { ps: "ټایني ټاټس پلورنځی", "fa-AF": "فروشگاه تینی ټاتس" },
} as const;

const localizeVendor = (vendor: string, locale: SupportedLocale) => {
  if (locale === "en") return vendor;
  return vendorTranslations[vendor as keyof typeof vendorTranslations]?.[locale] ?? vendor;
};

const localizeProductName = (
  productId: string,
  fallbackName: string,
  locale: SupportedLocale,
) => {
  const product = productData.featuredProducts.find((p) => p.id === productId);
  if (!product) return fallbackName;
  if (locale === "en" || locale === "ps" || locale === "fa-AF") {
    return product.name[locale];
  }
  return product.name.en;
};

const headerCopy: Record<
  SupportedLocale,
  {
    searchSuggestions: string[];
    searchButton: string;
    mobileSearchPlaceholder: string;
    exploreCategories: string;
    storeDepartments: string;
    discoverEverything: string;
    home: string;
    products: string;
    giftSets: string;
    gifts: string;
    new: string;
    babyCare: string;
    dailyDeals: string;
    support: string;
    more: string;
    quickLinks: string;
    hot: string;
    yourBasket: string;
    itemsReady: string;
    startShopping: string;
    basketEmpty: string;
    basketEmptyDesc: string;
    browseProducts: string;
    estimatedTotal: string;
    viewFullBasket: string;
    languageSelect: string;
  }
> = {
  en: {
    searchSuggestions: [
      "Search for fresh fruits...",
      "Find organic vegetables...",
      "Discover artisan bread...",
      "Shop local dairy products...",
      "Browse premium coffee...",
    ],
    searchButton: "Search",
    mobileSearchPlaceholder: "Search...",
    exploreCategories: "Explore Categories",
    storeDepartments: "Store Departments",
    discoverEverything: "Discover Everything",
    home: "Home",
    products: "Products",
    giftSets: "Gift Sets",
    gifts: "Gifts",
    new: "New",
    babyCare: "Baby Care",
    dailyDeals: "Daily Deals",
    support: "Support",
    more: "More",
    quickLinks: "Quick Links",
    hot: "Hot",
    yourBasket: "Your Basket",
    itemsReady: "items ready",
    startShopping: "Start shopping",
    basketEmpty: "Your basket is empty",
    basketEmptyDesc:
      "Treat your family to something special! Browse our marketplace for the freshest items.",
    browseProducts: "Browse Products",
    estimatedTotal: "Estimated Total",
    viewFullBasket: "View Full Basket",
    languageSelect: "Language Select",
  },
  ps: {
    searchSuggestions: [
      "تازه مېوې ولټوئ...",
      "عضوي سبزيجات ومومئ...",
      "لاسي ډوډۍ وګورئ...",
      "محلي لبنیات واخلئ...",
      "پریمیم قهوه ولټوئ...",
    ],
    searchButton: "لټون",
    mobileSearchPlaceholder: "لټون...",
    exploreCategories: "کټګورۍ وپلټئ",
    storeDepartments: "د پلورنځي څانګې",
    discoverEverything: "هر څه ومومئ",
    home: "کور",
    products: "محصولات",
    giftSets: "د ډالۍ بستې",
    gifts: "ډالۍ",
    new: "نوی",
    babyCare: "د ماشوم پاملرنه",
    dailyDeals: "ورځني وړاندیزونه",
    support: "مرسته",
    more: "نور",
    quickLinks: "چټک لینکونه",
    hot: "ګرم",
    yourBasket: "ستاسو باسکټ",
    itemsReady: "توکي چمتو",
    startShopping: "پیرود پیل کړئ",
    basketEmpty: "ستاسو باسکټ خالي دی",
    basketEmptyDesc:
      "خپلې کورنۍ ته یو ځانګړی څه واخلئ! زموږ مارکیټ وپلټئ او تازه توکي ومومئ.",
    browseProducts: "محصولات وګورئ",
    estimatedTotal: "اټکلی ټولټال",
    viewFullBasket: "بشپړ باسکټ وګورئ",
    languageSelect: "ژبه وټاکئ",
  },
  "fa-AF": {
    searchSuggestions: [
      "جستجوی میوه تازه...",
      "سبزیجات ارگانیک پیدا کنید...",
      "نان دست‌ساز را ببینید...",
      "لبنیات محلی خرید کنید...",
      "قهوه ممتاز جستجو کنید...",
    ],
    searchButton: "جستجو",
    mobileSearchPlaceholder: "جستجو...",
    exploreCategories: "کاوش دسته‌بندی‌ها",
    storeDepartments: "بخش‌های فروشگاه",
    discoverEverything: "همه چیز را ببینید",
    home: "خانه",
    products: "محصولات",
    giftSets: "بسته‌های هدیه",
    gifts: "هدایا",
    new: "جدید",
    babyCare: "مراقبت نوزاد",
    dailyDeals: "پیشنهادهای روزانه",
    support: "پشتیبانی",
    more: "بیشتر",
    quickLinks: "لینک‌های سریع",
    hot: "داغ",
    yourBasket: "سبد شما",
    itemsReady: "آیتم آماده",
    startShopping: "خرید را شروع کنید",
    basketEmpty: "سبد شما خالی است",
    basketEmptyDesc:
      "برای خانواده‌تان چیزی ویژه بگیرید! بازار ما را ببینید و تازه‌ترین اقلام را پیدا کنید.",
    browseProducts: "مشاهده محصولات",
    estimatedTotal: "جمع تخمینی",
    viewFullBasket: "مشاهده سبد کامل",
    languageSelect: "انتخاب زبان",
  },
};

export default function Header() {
  const t = useTranslations("Homepage.navbar");
  const locale = useLocale() as SupportedLocale;
  const pathname = usePathname();
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const isV2Home = pathname?.includes("/home-v2");
  const isV3Home = pathname?.includes("/home-v3");
  const copy = headerCopy[safeLocale];
  const { isAuthenticated } = useAuth();
  const { cart, itemCount, total, removeItem, updateQuantity, refreshCart } = useCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [showV2MoreMenu, setShowV2MoreMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Refresh cart when drawer opens
  useEffect(() => {
    if (isCartOpen) {
      refreshCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartOpen]);

  // Typewriter placeholder effect
  const searchSuggestions = copy.searchSuggestions;
  const [placeholderText, setPlaceholderText] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const v2MoreMenuRef = useRef<HTMLDivElement>(null);

  // Typewriter effect - stops when user focuses on search
  useEffect(() => {
    if (isSearchFocused || searchQuery) return;

    const currentSuggestion = searchSuggestions[suggestionIndex];
    const typeSpeed = isDeleting ? 30 : 80;

    const timeout = setTimeout(() => {
      if (!isDeleting && charIndex < currentSuggestion.length) {
        setPlaceholderText(currentSuggestion.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (isDeleting && charIndex > 0) {
        setPlaceholderText(currentSuggestion.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else if (!isDeleting && charIndex === currentSuggestion.length) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setSuggestionIndex((prev) => (prev + 1) % searchSuggestions.length);
      }
    }, typeSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, suggestionIndex, isSearchFocused, searchQuery]);

  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogin = () => router.push("/auth/login");

  const closeAll = useCallback(() => {
    setShowCategoriesDropdown(false);
    setShowV2MoreMenu(false);
    setIsCartOpen(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target as Node)
      ) {
        setShowCategoriesDropdown(false);
      }
      if (
        v2MoreMenuRef.current &&
        !v2MoreMenuRef.current.contains(event.target as Node)
      ) {
        setShowV2MoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isV3Home) {
    return (
      <>
        <div className="hidden bg-[var(--green)] text-white md:block">
          <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-xs font-semibold">
            <p>Fresh groceries everyday</p>
            <div className="flex items-center gap-4">
              <Link href="/vendor/register" className="hover:text-white/90">Sell on Mandawee</Link>
              <Link href="/track-order" className="hover:text-white/90">Track Order</Link>
            </div>
          </div>
        </div>

        <header dir={isRtl ? "rtl" : "ltr"} className="sticky top-0 z-[100] border-b border-[var(--green)]/20 bg-[var(--footerBg)] shadow-sm">
          <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2">
              <Link href="/" className="shrink-0">
                <Image src="/logos/onlinemandawee-logo.png" alt="logo" width={150} height={42} className="h-7 w-auto sm:h-8" />
              </Link>

              <div className="relative shrink-0" ref={categoriesRef}>
                <button
                  onClick={() => setShowCategoriesDropdown((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--green)] px-3 py-2 text-sm font-bold text-white"
                >
                  <Menu size={15} />
                  Categories
                </button>
                <AnimatePresence>
                  {showCategoriesDropdown && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute left-0 top-full z-[500] mt-2 w-72 rounded-lg border border-[var(--green)]/20 bg-[var(--footerBg)] p-2 shadow-xl"
                    >
                      {[
                        "Breakfast & Dairy",
                        "Meats & Seafood",
                        "Breads & Bakery",
                        "Chips & Snacks",
                        "Medical Healthcare",
                        "Frozen Foods",
                        "Grocery & Staples",
                        "Other Items",
                      ].map((name) => (
                        <button key={name} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--green)]/10">
                          <span>{name}</span>
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--green)]/15 text-[var(--green)]">+</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <form onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center rounded-md border border-[var(--green)]/20 bg-white px-2 py-1.5">
                <Search size={16} className="text-[var(--green)]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products..."
                  className="w-full bg-transparent px-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--green)]/55"
                />
                <button type="submit" className="rounded-md bg-[var(--green)] px-3 py-1.5 text-xs font-bold text-white">
                  Search
                </button>
              </form>

              <Link href="/cart" className="relative grid h-10 w-10 place-items-center rounded-full border border-[var(--green)]/25 bg-white text-[var(--green)]">
                <ShoppingBasket size={18} />
                {!!itemCount && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-[var(--green)] text-[10px] font-black text-white">
                    {itemCount}
                  </span>
                )}
              </Link>

              {!isAuthenticated && (
                <button
                  onClick={handleLogin}
                  className="hidden md:flex h-10 px-4 rounded-full border border-[var(--green)]/25 bg-white text-[var(--green)] text-sm font-semibold items-center justify-center hover:bg-[var(--green)]/5"
                >
                  Login
                </button>
              )}

              <Link
                href="/vendor/register"
                className="hidden md:flex h-10 px-4 rounded-full bg-[var(--green)] text-white text-sm font-semibold items-center justify-center hover:brightness-110"
              >
                Become a Vendor
              </Link>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 md:hidden">
              {!isAuthenticated && (
                <button
                  onClick={handleLogin}
                  className="h-9 rounded-md border border-[var(--green)]/25 bg-white text-sm font-semibold text-[var(--green)] hover:bg-[var(--green)]/5"
                >
                  Login
                </button>
              )}
              <Link
                href="/vendor/register"
                className={`h-9 rounded-md bg-[var(--green)] text-center text-sm font-semibold leading-9 text-white hover:brightness-110 ${!isAuthenticated ? "" : "col-span-2"}`}
              >
                Become a Vendor
              </Link>
            </div>
          </div>
        </header>

        <nav className="border-b border-[var(--green)]/20 bg-white">
          <div className="mx-auto flex h-11 max-w-7xl items-center gap-6 overflow-x-auto px-4 text-sm font-semibold text-[var(--foreground)] no-scrollbar">
            <Link href="/" className="shrink-0 hover:text-[var(--green)]">Home</Link>
            <Link href="/products" className="shrink-0 hover:text-[var(--green)]">Products</Link>
            <Link href="/deals" className="shrink-0 hover:text-[var(--green)]">Daily Deals</Link>
            <Link href="/gifts" className="shrink-0 hover:text-[var(--green)]">Gift Sets</Link>
            <Link href="/contact" className="shrink-0 hover:text-[var(--green)]">Contact Us</Link>
          </div>
        </nav>
      </>
    );
  }

  if (isV2Home) {
    return (
      <>
        <div className="hidden bg-[var(--secondary)] text-white md:block">
          <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-xs">
            <p className="font-semibold">Multi-vendor grocery marketplace</p>
            <div className="flex items-center gap-4 text-white/90">
              <Link href="/vendor/register" className="hover:text-white">
                Become a Vendor
              </Link>
              <Link href="/track-order" className="hover:text-white">
                Track Order
              </Link>
            </div>
          </div>
        </div>

        <header
          dir={isRtl ? "rtl" : "ltr"}
          className="sticky top-0 z-[9998] border-b border-slate-200 bg-white shadow-sm overflow-x-clip"
        >
          <div className="mx-auto w-full max-w-7xl px-2 py-3 sm:px-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="shrink-0">
                <Image
                  src="/logos/onlinemandawee-logo.png"
                  alt="logo"
                  width={180}
                  height={52}
                  className="h-8 sm:h-10 w-auto"
                  priority
                />
              </Link>

              <div className="hidden lg:flex items-center gap-2 rounded-full bg-[var(--footerBg)] px-3 py-2 text-xs font-semibold text-slate-700">
                <MapPin size={14} className="text-[var(--secondary)]" />
                Deliver to Kabul
              </div>

              <form
                onSubmit={handleSearch}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--secondary)]/20 bg-[var(--footerBg)] px-2 h-11 ${isRtl ? "pr-4" : "pl-4"}`}
              >
                <Search className="text-[var(--secondary)] shrink-0" size={18} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="rounded-full bg-[var(--secondary)] px-4 py-2 text-xs font-bold text-white hover:brightness-110"
                >
                  {copy.searchButton}
                </button>
              </form>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setIsCartOpen(true)}
                  aria-label={t("cartLabel")}
                  className="relative h-10 w-10 rounded-full border border-[var(--secondary)]/20 bg-white text-[var(--secondary)] hover:bg-[var(--secondary)]/5"
                >
                  <span className="absolute inset-0 grid place-items-center">
                    <ShoppingBasket size={19} />
                  </span>
                  {!!itemCount && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-[var(--secondary)] text-[10px] font-black text-white">
                      {itemCount}
                    </span>
                  )}
                </button>
                {!isAuthenticated && (
                  <button
                    onClick={handleLogin}
                    className="hidden md:flex h-10 px-4 rounded-full border border-[var(--secondary)]/20 text-[var(--secondary)] text-sm font-semibold items-center justify-center hover:bg-[var(--secondary)]/5"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <nav
          dir={isRtl ? "rtl" : "ltr"}
          className="relative z-[150] border-b border-slate-200 bg-white text-slate-700"
        >
          <div className="mx-auto flex h-12 max-w-7xl items-center gap-2 px-2 sm:gap-3 sm:px-4">
            <div className="relative shrink-0" ref={categoriesRef}>
              <button
                onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--secondary)] px-3 py-2 text-xs font-bold text-white hover:brightness-110 sm:gap-2 sm:px-4"
              >
                <Menu size={14} />
                Categories
                <ChevronDown size={14} className={showCategoriesDropdown ? "rotate-180" : ""} />
              </button>
              <AnimatePresence>
                {showCategoriesDropdown && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={`absolute top-full z-[400] mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${
                      isRtl ? "right-0" : "left-0"
                    }`}
                  >
                    {[
                      {
                        href: "/category/breakfast",
                        label:
                          safeLocale === "en"
                            ? "Breakfast Items"
                            : safeLocale === "ps"
                              ? "د ناشتې توکي"
                              : "اقلام صبحانه",
                        icon: <Croissant size={16} />,
                      },
                      {
                        href: "/category/grocery",
                        label:
                          safeLocale === "en"
                            ? "Edible Grocery"
                            : safeLocale === "ps"
                              ? "خوراکي توکي"
                              : "مواد خوراکی",
                        icon: <ShoppingBag size={16} />,
                      },
                      {
                        href: "/category/snacks",
                        label:
                          safeLocale === "en"
                            ? "Snack Bar"
                            : safeLocale === "ps"
                              ? "سنک بار"
                              : "اسنک بار",
                        icon: <Cookie size={16} />,
                      },
                      {
                        href: "/category/beverages",
                        label:
                          safeLocale === "en"
                            ? "Beverages"
                            : safeLocale === "ps"
                              ? "مشروبات"
                              : "نوشیدنی‌ها",
                        icon: <Wine size={16} />,
                      },
                      {
                        href: "/category/fruits",
                        label:
                          safeLocale === "en"
                            ? "Fruits"
                            : safeLocale === "ps"
                              ? "مېوې"
                              : "میوه‌ها",
                        icon: <Cherry size={16} />,
                      },
                      {
                        href: "/category/vegetables",
                        label:
                          safeLocale === "en"
                            ? "Vegetables"
                            : safeLocale === "ps"
                              ? "سبزیجات"
                              : "سبزیجات",
                        icon: <Carrot size={16} />,
                      },
                      {
                        href: "/category/dairy",
                        label:
                          safeLocale === "en"
                            ? "Dairy Products"
                            : safeLocale === "ps"
                              ? "لبنیات"
                              : "لبنیات",
                        icon: <GlassWater size={16} />,
                      },
                      {
                        href: "/category/cleaning-products",
                        label:
                          safeLocale === "en"
                            ? "Cleaning Products"
                            : safeLocale === "ps"
                              ? "د پاکولو توکي"
                              : "محصولات نظافتی",
                        icon: <SprayCanIcon size={16} />,
                      },
                      { href: "/category/baby-care", label: copy.babyCare, icon: <Baby size={16} /> },
                      {
                        href: "/category/personal-care",
                        label:
                          safeLocale === "en"
                            ? "Personal Care"
                            : safeLocale === "ps"
                              ? "شخصي پاملرنه"
                              : "مراقبت شخصی",
                        icon: <Heart size={16} />,
                      },
                      {
                        href: "/category/whey-proteins",
                        label:
                          safeLocale === "en"
                            ? "Whey Proteins"
                            : safeLocale === "ps"
                              ? "وی پروټین"
                              : "پروتئین وی",
                        icon: <Dumbbell size={16} />,
                      },
                      {
                        href: "/category/stationery-items",
                        label:
                          safeLocale === "en"
                            ? "Stationery Items"
                            : safeLocale === "ps"
                              ? "د قرطاسیه توکي"
                              : "اقلام قرطاسیه",
                        icon: <PenTool size={16} />,
                      },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeAll}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]"
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    ))}
                    <Link
                      href="/products"
                      onClick={closeAll}
                      className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-black text-[var(--secondary)] hover:bg-[var(--secondary)]/10"
                    >
                      {copy.discoverEverything}
                      <ArrowRight size={16} />
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-0.5 text-sm font-semibold sm:gap-1">
              <Link href="/" className="shrink-0 rounded-full px-2 py-1.5 text-[13px] hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)] sm:px-3 sm:text-sm">
                Home
              </Link>
              <Link href="/products" className="shrink-0 rounded-full px-2 py-1.5 text-[13px] hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)] sm:px-3 sm:text-sm">
                Products
              </Link>
              <Link href="/deals" className="hidden md:inline-flex shrink-0 rounded-full px-3 py-1.5 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]">
                Daily Deals
              </Link>
              <Link href="/gifts" className="hidden md:inline-flex shrink-0 rounded-full px-3 py-1.5 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]">
                Gift Sets
              </Link>
              <Link href="/contact" className="hidden md:inline-flex shrink-0 rounded-full px-3 py-1.5 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]">
                Support
              </Link>

              <div className="relative ml-auto md:hidden" ref={v2MoreMenuRef}>
                <button
                  onClick={() => setShowV2MoreMenu((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--secondary)]/20 px-2.5 py-1.5 text-[11px] font-bold text-[var(--secondary)] sm:px-3 sm:text-xs"
                >
                  {copy.more}
                  <ChevronDown size={12} className={showV2MoreMenu ? "rotate-180" : ""} />
                </button>
                <AnimatePresence>
                  {showV2MoreMenu && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute right-0 top-full z-[450] mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                    >
                      <Link
                        href="/deals"
                        onClick={closeAll}
                        className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[var(--secondary)]/10"
                      >
                        Daily Deals
                      </Link>
                      <Link
                        href="/gifts"
                        onClick={closeAll}
                        className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[var(--secondary)]/10"
                      >
                        Gift Sets
                      </Link>
                      <Link
                        href="/contact"
                        onClick={closeAll}
                        className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[var(--secondary)]/10"
                      >
                        Support
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </nav>

        {/* ================= CART SHEET (MODERN SIDEBAR) ================= */}
        {isCartOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="overflow-hidden"
              style={{ position: "fixed", inset: 0, zIndex: 999999 }}
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setIsCartOpen(false)}
                className="bg-black/40 backdrop-blur-sm cursor-pointer"
                style={{ position: "fixed", inset: 0, zIndex: 999999 }}
              />
              {/* Sheet Side Panel */}
              <motion.div
                variants={sheetVariants}
                initial="hidden"
                animate="visible"
                className="h-screen w-full max-w-[440px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.25)] flex flex-col"
                style={{ position: "fixed", top: 0, right: 0, zIndex: 1000000 }}
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="bg-[var(--secondary)]/10 p-3 rounded-2xl border border-[var(--secondary)]/20"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <ShoppingBasket size={26} className="text-[var(--secondary)]" />
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">
                        {copy.yourBasket}
                      </h2>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {itemCount > 0
                          ? `${itemCount} ${copy.itemsReady}`
                          : copy.startShopping}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setIsCartOpen(false)}
                    className="h-11 w-11 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all cursor-pointer group border border-gray-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X
                      size={22}
                      className="text-gray-400 group-hover:text-gray-900 transition-colors"
                    />
                  </motion.button>
                </div>

                {/* Cart Content Area */}
                <div className="flex-1 overflow-y-auto">
                  {itemCount === 0 ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center h-full">
                      <motion.div
                        className="w-36 h-36 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mb-6 ring-4 ring-gray-50 shadow-inner"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      >
                        <ShoppingBasket
                          size={60}
                          className="text-gray-300"
                          strokeWidth={1.5}
                        />
                      </motion.div>
                      <motion.h3
                        className="text-2xl font-black text-gray-900 mb-2"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {copy.basketEmpty}
                      </motion.h3>
                      <motion.p
                        className="text-gray-500 max-w-[280px] text-sm leading-relaxed mb-8"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        {copy.basketEmptyDesc}
                      </motion.p>
                      <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Link
                          href="/products"
                          onClick={() => setIsCartOpen(false)}
                          className="inline-flex items-center gap-2 px-10 py-4 bg-[var(--secondary)] text-white rounded-full font-bold shadow-[0_10px_30px_-5px_rgba(15,52,96,0.35)] hover:shadow-[0_15px_40px_-5px_rgba(15,52,96,0.45)] hover:-translate-y-0.5 active:scale-95 transition-all"
                        >
                          <Search size={18} />
                          {copy.browseProducts}
                        </Link>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {cart.items.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-4 p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="relative w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={item.productImage}
                              alt={localizeProductName(
                                item.productId,
                                item.productName,
                                safeLocale,
                              )}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {localizeProductName(
                                item.productId,
                                item.productName,
                                safeLocale,
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              <bdi>{localizeVendor(item.vendor, safeLocale)}</bdi>
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-gray-900">
                                ${item.productPrice.toFixed(2)}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                >
                                  -
                                </button>
                                <span className="text-sm font-medium w-6 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-gray-400 hover:text-[var(--secondary)] self-start"
                          >
                            <X size={18} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sticky Footer */}
                {itemCount > 0 && (
                  <motion.div
                    className="p-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-gray-500 uppercase text-xs tracking-widest">
                        {copy.estimatedTotal}
                      </span>
                      <span className="text-2xl font-black text-gray-900">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                    <Link
                      href="/cart"
                      onClick={() => setIsCartOpen(false)}
                      className="w-full py-4 bg-gray-900 text-white rounded-full font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-all group"
                    >
                      {copy.viewFullBasket}
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <>
      <div
        className={`hidden text-white md:block ${
          isV2Home
            ? "bg-[var(--secondary)]"
            : "bg-[#0f3460]"
        }`}
      >
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-xs">
          <p className="font-semibold">
            {isV2Home
              ? "Fresh deals daily · Multi-vendor grocery marketplace"
              : "Free Delivery on Orders Above $100"}
          </p>
          <div className="flex items-center gap-4 text-white/90">
            <Link href="/vendor/register" className="hover:text-white">
              Sell on Mandawee
            </Link>
            <Link href="/track-order" className="hover:text-white">
              Track Order
            </Link>
          </div>
        </div>
      </div>
      {/* TOP BAR – sticky (logo, search, account, cart) */}
      <header
        dir={isRtl ? "rtl" : "ltr"}
        className={`sticky top-0 z-[9998] border-b backdrop-blur-xl shadow-sm overflow-x-clip ${
          isV2Home
            ? "border-[var(--secondary)]/15 bg-white/90 shadow-[0_8px_24px_rgba(15,52,96,0.12)]"
            : "border-gray-100 bg-white/95"
        }`}
      >
        <div className="mx-auto w-full max-w-7xl px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex min-w-0 flex-nowrap items-center justify-between gap-2 sm:gap-3 md:gap-4">
            {/* LOGO */}
            <Link
              href="/"
              className="flex-shrink-0 order-1"
            >
              <Image
                src="/logos/onlinemandawee-logo.png"
                alt="logo"
                width={180}
                height={52}
                className="h-7 sm:h-9 md:h-10 lg:h-11 w-auto drop-shadow-sm transition-transform hover:scale-105"
                priority
              />
            </Link>

            {/* SEARCH - Desktop & Tablet */}
            <form
              onSubmit={handleSearch}
              className={`hidden md:flex order-2 min-w-0 flex-1 items-center gap-3 px-2 rounded-full h-11 border transition-all duration-300 group max-w-3xl shadow-sm ${
                isV2Home
                  ? "bg-[var(--footerBg)]/80 hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--secondary)]/20 border-[var(--secondary)]/20"
                  : "bg-white hover:bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 border-gray-200"
              } ${isRtl ? "pr-5" : "pl-5"}`}
            >
              <Search
                className="text-gray-400 group-focus-within:text-primary transition-colors shrink-0"
                size={20}
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder={
                  isSearchFocused || searchQuery
                    ? t("searchPlaceholder")
                    : placeholderText
                }
                className="w-full bg-transparent outline-none text-[15px] font-medium placeholder:text-gray-400"
              />
              <button
                type="submit"
                className={`relative overflow-hidden active:scale-95 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isV2Home
                    ? "bg-[var(--secondary)]"
                    : "bg-primary"
                }`}
                style={
                  {
                    // background: "linear-gradient(135deg, var(--primary) 0%, #991B1B 100%)",
                  }
                }
              >
                <span className="relative z-10">{copy.searchButton}</span>
                <Sparkles className="relative z-10 h-4 w-4" />
                <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
              </button>
            </form>

            {/* RIGHT ICONS - Integrated Professional Row */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 md:gap-3 order-3">
              {/* Mobile Search Toggle */}
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="md:hidden h-9 w-9 flex items-center justify-center rounded-full border border-gray-100 bg-white text-gray-500 hover:text-primary transition-colors cursor-pointer"
              >
                <Search size={19} />
              </button>

              {/* Language Selector - First */}
              <div className="hidden md:flex items-center">
                <LanguageSelector
                  locale={locale}
                  label={copy.languageSelect}
                  isRtl={isRtl}
                  languages={[
                    { code: "en", label: "English", flag: "🇺🇸" },
                    { code: "ps", label: "پښتو", flag: "🇦🇫" },
                    { code: "fa-AF", label: "دری", flag: "🇦🇫" },
                  ]}
                />
              </div>

              {/* Cart Button - Second */}
              <IconButton
                onClick={() => setIsCartOpen(true)}
                badge={itemCount?.toString()}
                aria-label={t("cartLabel")}
              >
                <ShoppingBasket size={20} />
              </IconButton>

              {/* Login Button - Third */}
              {!isAuthenticated && (
                <button
                  onClick={handleLogin}
                  className={`hidden md:flex h-9 px-4 rounded-full text-sm font-semibold transition-colors cursor-pointer items-center justify-center ${
                    isV2Home
                      ? "bg-white border border-[var(--secondary)]/20 text-[var(--secondary)] hover:bg-[var(--secondary)]/5"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Login
                </button>
              )}

              {/* Become a Vendor Button - Fourth */}
              <Link
                href="/vendor/register"
                className={`hidden md:flex h-9 px-4 rounded-full text-white text-sm font-semibold inline-flex items-center transition-all shadow-sm ${
                  isV2Home
                    ? "bg-[var(--secondary)] hover:brightness-110"
                    : "bg-primary hover:brightness-110"
                }`}
              >
                Become a Vendor
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar Expansion */}
          <AnimatePresence>
            {showMobileSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden mt-3 overflow-hidden pb-1"
              >
                <form
                  onSubmit={handleSearch}
                  className="relative flex items-center gap-2 bg-white px-3 py-2 rounded-full border border-gray-200 shadow-sm"
                >
                  <Search className="text-gray-400 shrink-0" size={18} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder={
                      isSearchFocused || searchQuery
                        ? copy.mobileSearchPlaceholder
                        : placeholderText
                    }
                    className="flex-1 bg-transparent outline-none text-[15px] font-medium placeholder:text-gray-400 min-w-0"
                  />
                  <button
                    type="submit"
                    className="relative overflow-hidden active:scale-95 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg transition-all shrink-0 flex items-center gap-1.5"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary) 0%, #991B1B 100%)",
                    }}
                  >
                    <span className="relative z-10">{copy.searchButton}</span>
                    <Sparkles className="relative z-10 h-3 w-3" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* PRIMARY NAV – scrolls normally */}
      <nav
        dir={isRtl ? "rtl" : "ltr"}
        className={`relative z-[9997] overflow-x-clip border-t shadow-[0_6px_16px_rgba(15,23,42,0.2)] ${
          isV2Home
            ? "bg-white text-slate-700 border-slate-200 shadow-[0_4px_10px_rgba(15,52,96,0.08)]"
            : "bg-primary text-white border-white/20"
        }`}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center h-12 sm:h-14">
          {/* CATEGORIES BUTTON */}
          <div className="relative flex-shrink-0" ref={categoriesRef}>
            <button
              onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
              className={`flex items-center gap-1.5 sm:gap-2.5 font-bold h-12 sm:h-14 px-2 sm:px-5 lg:px-6 transition-all duration-300 cursor-pointer border-white/15 ${isRtl ? "border-l" : "border-r"} ${
                showCategoriesDropdown
                  ? `bg-white ${isV2Home ? "text-[var(--secondary)]" : "text-primary"} shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]`
                  : isV2Home
                    ? "bg-[var(--secondary)] text-white border-transparent hover:brightness-110 rounded-lg h-10 sm:h-11 mt-1.5 mb-1.5"
                    : "bg-black/20 hover:bg-black/35"
              }`}
            >
              <Menu size={18} />
              <span className="hidden leading-none sm:inline mt-0.5 tracking-tight">
                {copy.exploreCategories}
              </span>
              <ChevronDown
                size={14}
                className={`hidden sm:block transition-transform duration-300 opacity-60 ${showCategoriesDropdown ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {showCategoriesDropdown && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={`absolute top-full w-[min(92vw,380px)] bg-white text-gray-800 rounded-b-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] z-[9999] border-x border-b border-gray-100 overflow-hidden max-h-[70vh] overflow-y-auto ${isRtl ? "right-0" : "left-0"}`}
                >
                  <div className="p-4 grid gap-1">
                    <p className="px-4 py-2 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                      {copy.storeDepartments}
                    </p>

                    {/* Food & Grocery */}
                    <CategoryItem
                      href="/category/breakfast"
                      icon={<Croissant size={18} />}
                      label={safeLocale === "en" ? "Breakfast Items" : safeLocale === "ps" ? "د ناشتې توکي" : "اقلام صبحانه"}
                      onClick={closeAll}
                    />
                    <CategoryItem
                      href="/category/grocery"
                      icon={<ShoppingBag size={18} />}
                      label={safeLocale === "en" ? "Edible Grocery" : safeLocale === "ps" ? "خوراکي توکي" : "مواد خوراکی"}
                      onClick={closeAll}
                    />
                    <CategoryItem
                      href="/category/snacks"
                      icon={<Cookie size={18} />}
                      label={safeLocale === "en" ? "Snack Bar" : safeLocale === "ps" ? "سنک بار" : "اسنک بار"}
                      onClick={closeAll}
                    />
                    <CategoryItem
                      href="/category/beverages"
                      icon={<Wine size={18} />}
                      label={safeLocale === "en" ? "Beverages" : safeLocale === "ps" ? "مشروبات" : "نوشیدنی‌ها"}
                      onClick={closeAll}
                    />
                    <CategoryItem
                      href="/category/fruits"
                      icon={<Cherry size={18} />}
                      label={safeLocale === "en" ? "Fruits" : safeLocale === "ps" ? "مېوې" : "میوه‌ها"}
                      onClick={closeAll}
                    />
                    <CategoryItem
                      href="/category/vegetables"
                      icon={<Carrot size={18} />}
                      label={safeLocale === "en" ? "Vegetables" : safeLocale === "ps" ? "سبزیجات" : "سبزیجات"}
                      onClick={closeAll}
                    />
                    <CategoryItem
                      href="/category/dairy"
                      icon={<GlassWater size={18} />}
                      label={safeLocale === "en" ? "Dairy Products" : safeLocale === "ps" ? "لبنیات" : "لبنیات"}
                      onClick={closeAll}
                    />

                    <div className="h-px bg-gray-100 my-2 mx-4" />

                    {/* Home & Personal Care */}
                    <CategoryItem
                      href="/category/cleaning-products"
                      icon={<SprayCanIcon size={18} />}
                      label={safeLocale === "en" ? "Cleaning Products" : safeLocale === "ps" ? "د پاکولو توکي" : "محصولات نظافتی"}
                      onClick={closeAll}
                    />
                    <CategoryItem
                      href="/category/baby-care"
                      icon={<Baby size={18} />}
                      label={copy.babyCare}
                      onClick={closeAll}
                    />
                    <CategoryItem
                      href="/category/personal-care"
                      icon={<Heart size={18} />}
                      label={safeLocale === "en" ? "Personal Care" : safeLocale === "ps" ? "شخصي پاملرنه" : "مراقبت شخصی"}
                      onClick={closeAll}
                    />

                    <div className="h-px bg-gray-100 my-2 mx-4" />

                    {/* Health & Stationery */}
                    <CategoryItem
                      href="/category/whey-proteins"
                      icon={<Dumbbell size={18} />}
                      label={safeLocale === "en" ? "Whey Proteins" : safeLocale === "ps" ? "وی پروټین" : "پروتئین وی"}
                      onClick={closeAll}
                    />
                    <CategoryItem
                      href="/category/stationery-items"
                      icon={<PenTool size={18} />}
                      label={safeLocale === "en" ? "Stationery Items" : safeLocale === "ps" ? "د قرطاسیه توکي" : "اقلام قرطاسیه"}
                      onClick={closeAll}
                    />

                    <div className="h-px bg-gray-100 my-2 mx-4" />
                    <Link
                      href="/products"
                      onClick={closeAll}
                      className="mx-2 px-5 py-4 text-sm font-black text-primary hover:bg-primary/5 rounded-2xl flex items-center justify-between group transition-all"
                    >
                      {copy.discoverEverything}{" "}
                      <ArrowRight
                        size={18}
                        className="group-hover:translate-x-1.5 transition-transform"
                      />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* NAV LINKS */}
          {/* Desktop - All Links */}
          <div className="hidden lg:flex flex-1 items-center gap-2 px-5 lg:px-7 py-1.5 text-[13px] lg:text-[14px] font-bold">
            <Link
              href="/"
              className={`inline-flex h-8 items-center rounded-md px-3 transition-all ${
                isV2Home
                  ? "text-slate-700 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]"
                  : "hover:bg-white/18 hover:text-white"
              }`}
            >
              {copy.home}
            </Link>
            <Link
              href="/products"
              className={`inline-flex h-8 items-center rounded-md px-3 transition-all ${
                isV2Home
                  ? "text-slate-700 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]"
                  : "hover:bg-white/18 hover:text-white"
              }`}
            >
              {copy.products}
            </Link>
            <Link
              href="/gifts"
              className={`inline-flex h-8 items-center rounded-md px-3 relative flex items-center gap-2 group transition-all ${
                isV2Home
                  ? "text-slate-700 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]"
                  : "hover:bg-white/18 hover:text-white"
              }`}
            >
              {copy.giftSets}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm group-hover:scale-110 transition-transform ${
                  isV2Home ? "text-white bg-[var(--secondary)]" : "text-white"
                }`}
                style={isV2Home ? undefined : { backgroundColor: "var(--yellow)" }}
              >
                {copy.new}
              </span>
            </Link>
            <Link
              href="/baby-packages"
              className={`inline-flex h-8 items-center rounded-md px-3 transition-all ${
                isV2Home
                  ? "text-slate-700 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]"
                  : "hover:bg-white/18 hover:text-white"
              }`}
            >
              {copy.babyCare}
            </Link>
            <Link
              href="/deals"
              className={`inline-flex h-8 items-center rounded-md px-3 flex items-center gap-1.5 transition-all ${
                isV2Home
                  ? "text-slate-700 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]"
                  : "hover:bg-white/18 hover:text-white"
              }`}
            >
              <Zap
                size={15}
                style={
                  isV2Home
                    ? { color: "var(--secondary)", fill: "var(--secondary)" }
                    : { color: "var(--yellow)", fill: "var(--yellow)" }
                }
              />{" "}
              {copy.dailyDeals}
            </Link>
            <Link
              href="/contact"
              className={`inline-flex h-8 items-center rounded-md px-3 transition-all ${
                isV2Home
                  ? "text-slate-700 hover:bg-[var(--secondary)]/10 hover:text-[var(--secondary)]"
                  : "hover:bg-white/18 hover:text-white"
              }`}
            >
              {copy.support}
            </Link>
          </div>

          {/* Tablet - Limited Links */}
          <div className="hidden md:flex lg:hidden flex-1 min-w-0 px-2 py-1.5 overflow-visible">
            <div className="flex w-full min-w-max items-center gap-2 text-[13px] font-bold whitespace-nowrap">
              <Link href="/" className="inline-flex h-8 items-center rounded-md px-2 whitespace-nowrap transition-all hover:bg-white/18">
                {copy.home}
              </Link>
              <Link href="/products" className="inline-flex h-8 items-center rounded-md px-2 whitespace-nowrap transition-all hover:bg-white/18">
                {copy.products}
              </Link>
              <Link
                href="/gifts"
                className="inline-flex h-8 items-center rounded-md px-2 relative flex items-center gap-1 whitespace-nowrap transition-all hover:bg-white/18"
              >
                {copy.gifts}
                <span
                  className="text-white text-[8px] px-1 py-0.5 rounded-full font-black uppercase tracking-tighter"
                  style={{ backgroundColor: "var(--yellow)" }}
                >
                  {copy.new}
                </span>
              </Link>
              <MobileNavMenu closeAll={closeAll} isRtl={isRtl} />
            </div>
          </div>

          {/* Mobile - Limited Links + More Button */}
          <div className="flex md:hidden flex-1 min-w-0 px-1 py-1.5 overflow-visible">
            <div className="flex w-full min-w-0 items-center justify-between gap-1 pr-1 text-[10px] min-[360px]:text-[11px] font-bold whitespace-nowrap">
              <Link href="/" className="inline-flex h-7 items-center rounded-md px-1 whitespace-nowrap shrink min-w-0 transition-all hover:bg-white/18">
                {copy.home}
              </Link>
              <Link href="/products" className="inline-flex h-7 items-center rounded-md px-1 whitespace-nowrap shrink min-w-0 transition-all hover:bg-white/18">
                {copy.products}
              </Link>
              <Link
                href="/gifts"
                className="inline-flex h-7 items-center rounded-md px-1 relative flex items-center gap-1 whitespace-nowrap shrink min-w-0 transition-all hover:bg-white/18"
              >
                {copy.gifts}
                <span
                  className="hidden min-[360px]:inline-flex text-white text-[8px] px-1 py-0.5 rounded-full font-black uppercase tracking-tighter"
                  style={{ backgroundColor: "var(--yellow)" }}
                >
                  {copy.new}
                </span>
              </Link>
              <MobileNavMenu closeAll={closeAll} isRtl={isRtl} />
            </div>
          </div>
        </div>
      </nav>

      {/* ================= CART SHEET (MODERN SIDEBAR) ================= */}
      <AnimatePresence>
        {isCartOpen && (
          <div
            className="overflow-hidden"
            style={{ position: "fixed", inset: 0, zIndex: 999999 }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="bg-black/40 backdrop-blur-sm cursor-pointer"
              style={{ position: "fixed", inset: 0, zIndex: 999999 }}
            />
            {/* Sheet Side Panel */}
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="h-screen w-full max-w-[440px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.25)] flex flex-col"
              style={{ position: "fixed", top: 0, right: 0, zIndex: 1000000 }}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="bg-primary/10 p-3 rounded-2xl border border-primary/20"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <ShoppingBasket size={26} className="text-primary" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">
                      {copy.yourBasket}
                    </h2>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {itemCount > 0
                        ? `${itemCount} ${copy.itemsReady}`
                        : copy.startShopping}
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={() => setIsCartOpen(false)}
                  className="h-11 w-11 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all cursor-pointer group border border-gray-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X
                    size={22}
                    className="text-gray-400 group-hover:text-gray-900 transition-colors"
                  />
                </motion.button>
              </div>

              {/* Cart Content Area */}
              <div className="flex-1 overflow-y-auto">
                {itemCount === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center h-full">
                    <motion.div
                      className="w-36 h-36 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mb-6 ring-4 ring-gray-50 shadow-inner"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    >
                      <ShoppingBasket
                        size={60}
                        className="text-gray-300"
                        strokeWidth={1.5}
                      />
                    </motion.div>
                    <motion.h3
                      className="text-2xl font-black text-gray-900 mb-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {copy.basketEmpty}
                    </motion.h3>
                    <motion.p
                      className="text-gray-500 max-w-[280px] text-sm leading-relaxed mb-8"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {copy.basketEmptyDesc}
                    </motion.p>
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Link
                        href="/products"
                        onClick={() => setIsCartOpen(false)}
                        className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-white rounded-full font-bold shadow-[0_10px_30px_-5px_rgba(220,53,69,0.4)] hover:shadow-[0_15px_40px_-5px_rgba(220,53,69,0.5)] hover:-translate-y-0.5 active:scale-95 transition-all"
                      >
                        <Search size={18} />
                        {copy.browseProducts}
                      </Link>
                    </motion.div>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {cart.items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-4 p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="relative w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.productImage}
                            alt={localizeProductName(
                              item.productId,
                              item.productName,
                              safeLocale,
                            )}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {localizeProductName(
                              item.productId,
                              item.productName,
                              safeLocale,
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            <bdi>{localizeVendor(item.vendor, safeLocale)}</bdi>
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-gray-900">
                              ${item.productPrice.toFixed(2)}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
                              >
                                -
                              </button>
                              <span className="text-sm font-medium w-6 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-500 self-start"
                        >
                          <X size={18} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              {itemCount > 0 && (
                <motion.div
                  className="p-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-gray-500 uppercase text-xs tracking-widest">
                      {copy.estimatedTotal}
                    </span>
                    <span className="text-2xl font-black text-gray-900">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <Link
                    href="/cart"
                    onClick={() => setIsCartOpen(false)}
                    className="w-full py-4 bg-gray-900 text-white rounded-full font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-all group"
                  >
                    {copy.viewFullBasket}
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ================= COMPONENT HELPERS ================= */

function CategoryItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-4 rounded-[1.25rem] hover:bg-primary/5 group transition-all duration-300"
    >
      <div className="w-11 h-11 flex items-center justify-center bg-gray-50 rounded-2xl group-hover:bg-white shadow-sm border border-gray-100 group-hover:border-primary/30 transition-all text-gray-400 group-hover:text-primary group-hover:scale-110 group-hover:rotate-3 shadow-inner">
        {icon}
      </div>
      <span className="font-bold text-gray-700 group-hover:text-gray-950 transition-colors text-[15px] tracking-tight">
        {label}
      </span>
      <ArrowRight
        size={16}
        className="ml-auto opacity-0 group-hover:opacity-100 transition-all text-primary translate-x-[-10px] group-hover:translate-x-0"
      />
    </Link>
  );
}

function LanguageSelector({
  locale,
  languages,
  label,
  isRtl,
}: {
  locale: string;
  languages: Array<{ code: string; label: string; flag: string }>;
  label: string;
  isRtl: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find((l) => l.code === locale) || languages[0];

  useEffect(() => {
    function click(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    window.addEventListener("mousedown", click);
    return () => window.removeEventListener("mousedown", click);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`h-9 px-3 rounded-full border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${open ? "bg-white shadow-lg border-primary/30 text-primary" : "bg-gray-50/80 border-gray-100 hover:bg-white text-gray-600"}`}
      >
        <span className="text-base w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100">
          {current.flag}
        </span>
        <span className="uppercase text-[10px] tracking-wider mt-0.5">
          {locale.split("-")[0]}
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-300 ${open ? "rotate-180 opacity-100" : "opacity-40"}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute mt-3 w-56 bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-100 z-[1001] overflow-hidden p-2 ${isRtl ? "left-0" : "right-0"}`}
          >
            <p className="px-5 py-3 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">
              {label}
            </p>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setOpen(false);
                  router.replace(pathname, { locale: l.code });
                }}
                className={`w-full px-5 py-3.5 rounded-xl text-sm font-bold flex items-center gap-4 transition-all cursor-pointer ${isRtl ? "text-right" : "text-left"} ${locale === l.code ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <span className="text-xl">{l.flag}</span> {l.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileNavMenu({
  closeAll,
  isRtl,
}: {
  closeAll: () => void;
  isRtl: boolean;
}) {
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const copy = headerCopy[safeLocale];
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/baby-packages", label: copy.babyCare, icon: <Baby size={18} /> },
    {
      href: "/deals",
      label: copy.dailyDeals,
      icon: <Zap size={18} />,
      highlight: true,
    },
    { href: "/contact", label: copy.support, icon: <HelpCircle size={18} /> },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`shrink-0 flex items-center gap-1 px-1.5 min-[360px]:px-2 py-1 rounded-full border transition-all ${
          isOpen
            ? "bg-white border-white text-primary shadow-lg"
            : "bg-white/10 border-white/20 text-white hover:bg-white/20"
        }`}
      >
        <span className="text-[10px] min-[360px]:text-[11px] sm:text-[13px] font-bold">{copy.more}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`absolute top-full mt-2 w-48 sm:w-52 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] z-[1002] overflow-hidden border border-gray-100 ${isRtl ? "left-0" : "right-0"}`}
            style={{ transformOrigin: isRtl ? "top left" : "top right" }}
          >
            <div className="p-2">
              <p className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                {copy.quickLinks}
              </p>
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => {
                      setIsOpen(false);
                      closeAll();
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all group"
                  >
                    <div
                      className={`w-9 h-9 flex items-center justify-center rounded-lg ${
                        link.highlight
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary"
                      } transition-colors`}
                    >
                      {link.icon}
                    </div>
                    <span className="font-semibold text-gray-700 text-[14px]">
                      {link.label}
                    </span>
                    {link.highlight && (
                      <span
                        className="ml-auto text-[9px] font-black text-white px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "var(--yellow)" }}
                      >
                        {copy.hot}
                      </span>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconButton({
  children,
  badge,
  onClick,
  active,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  badge?: string;
  onClick?: () => void;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-full border transition-all duration-300 group active:scale-90 cursor-pointer ${active ? "bg-primary border-primary text-white shadow-xl shadow-primary/30" : "border-gray-100 bg-white hover:bg-gray-50 text-gray-600 hover:text-primary hover:border-primary/30"}`}
    >
      {children}
      {badge && (
        <span
          className={`absolute -top-1 -right-1 text-[10px] font-black min-w-5 h-5 flex items-center justify-center rounded-full ring-2 shadow-md transition-all ${active ? "bg-white text-[var(--secondary)] ring-[var(--secondary)]" : "bg-[var(--secondary)] text-white ring-white"}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

