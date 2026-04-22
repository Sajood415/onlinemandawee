"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/store/auth-context";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";
import Link from "next/link";
import {
  Search,
  User,
  ShoppingCart,
  ShoppingBasket,
  ChevronDown,
  Check,
  Menu,
  Store,
  LayoutDashboard,
  Globe,
  DollarSign,
  X,
  Coffee,
  Cookie,
  Milk,
  Apple,
  Package,
  HelpCircle,
  Gift,
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
    portal: string;
    seller: string;
    dashboard: string;
    accountMenu: string;
    authenticatedAccount: string;
    profile: string;
    myOrders: string;
    signOut: string;
    accessAccount: string;
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
    currencySelect: string;
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
    portal: "Portal",
    seller: "Seller",
    dashboard: "Dashboard",
    accountMenu: "Account menu",
    authenticatedAccount: "Authenticated Account",
    profile: "Profile",
    myOrders: "My Orders",
    signOut: "Sign Out",
    accessAccount: "Access Account",
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
    currencySelect: "Currency Select",
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
    portal: "پورټل",
    seller: "پلورونکی",
    dashboard: "ډشبورډ",
    accountMenu: "د حساب مېنو",
    authenticatedAccount: "تایید شوی حساب",
    profile: "پروفایل",
    myOrders: "زما فرمایشونه",
    signOut: "وتل",
    accessAccount: "حساب ته ننوځئ",
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
    currencySelect: "کرنسي وټاکئ",
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
    portal: "پورتال",
    seller: "فروشنده",
    dashboard: "داشبورد",
    accountMenu: "منوی حساب",
    authenticatedAccount: "حساب تاییدشده",
    profile: "پروفایل",
    myOrders: "سفارش‌های من",
    signOut: "خروج",
    accessAccount: "ورود به حساب",
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
    currencySelect: "انتخاب ارز",
  },
};

export default function Header() {
  const t = useTranslations("Homepage.navbar");
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const copy = headerCopy[safeLocale];
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { cart, itemCount, total, removeItem, updateQuantity, refreshCart } = useCart();
  const { currency, setCurrency } = useCurrency();

  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
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

  const userMenuRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push("/");
  };

  const closeAll = useCallback(() => {
    setShowUserMenu(false);
    setShowCategoriesDropdown(false);
    setIsCartOpen(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target as Node)
      ) {
        setShowCategoriesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* TOP BAR – sticky (logo, search, account, cart) */}
      <header
        dir={isRtl ? "rtl" : "ltr"}
        className="sticky top-0 z-[100] border-b border-gray-100 bg-white/95 backdrop-blur-xl shadow-sm overflow-x-clip"
      >
        <div className="mx-auto w-full max-w-7xl px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex min-w-0 flex-nowrap items-center justify-between gap-1.5 sm:gap-4 md:gap-6 lg:gap-8">
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
                className="h-6 sm:h-10 md:h-12 lg:h-14 w-auto drop-shadow-sm transition-transform hover:scale-105"
                priority
              />
            </Link>

            {/* SEARCH - Desktop & Tablet */}
            <form
              onSubmit={handleSearch}
              className={`hidden md:flex order-2 min-w-0 flex-1 items-center gap-3 bg-white hover:bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 px-2 rounded-full h-12 border border-gray-200 transition-all duration-300 group max-w-2xl shadow-sm ${isRtl ? "pr-5" : "pl-5"}`}
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
                className="relative overflow-hidden active:scale-95 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg transition-all shrink-0 flex items-center gap-2 bg-linear-to-tr from-primary/90 to-primary cursor-pointer"
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
            <div
              className="flex shrink-0 items-center gap-1 sm:gap-3 md:gap-4 order-3"
            >
              {/* Mobile Search Toggle */}
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="md:hidden h-9 w-9 flex items-center justify-center rounded-full border border-gray-100 bg-white text-gray-500 hover:text-primary transition-colors cursor-pointer"
              >
                <Search size={19} />
              </button>

              {/* VENDOR PORTAL - Professional Row Alignment */}
              <Link
                href={
                  isAuthenticated && user?.role === "VENDOR"
                    ? "/vendor/dashboard"
                    : "/vendor/register"
                }
                className="hidden lg:flex items-center gap-3 group px-3 py-1.5 hover:bg-gray-50 rounded-full transition-all border border-transparent hover:border-gray-100"
              >
                <div className="h-9 w-9 flex items-center justify-center rounded-full bg-gray-50 group-hover:bg-primary/5 transition-all outline outline-1 outline-gray-100">
                  {isAuthenticated && user?.role === "VENDOR" ? (
                    <LayoutDashboard
                      size={18}
                      className="text-gray-600 group-hover:text-primary transition-colors"
                    />
                  ) : (
                    <Store
                      size={18}
                      className="text-gray-600 group-hover:text-primary transition-colors"
                    />
                  )}
                </div>
                <div className="flex flex-col -space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-primary transition-colors">
                    {copy.portal}
                  </span>
                  <span className="text-[13px] font-bold text-gray-700 group-hover:text-primary leading-tight transition-colors">
                    {isAuthenticated && user?.role === "VENDOR"
                      ? copy.dashboard
                      : copy.seller}
                  </span>
                </div>
              </Link>

              <div className="h-8 w-px bg-gray-100 hidden md:block mx-1" />

              {/* SELECTORS - Aligned properly */}
              <div className="hidden xl:flex items-center gap-2">
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
                <CurrencySelector label={copy.currencySelect} isRtl={isRtl} />
              </div>

              {/* USER & CART ICONS - Horizontal Alignment */}
              <div className="flex items-center gap-1 sm:gap-2.5">
                <div className="h-8 w-px bg-gray-100 hidden sm:block mx-1" />

                <div className="relative" ref={userMenuRef}>
                  <IconButton
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    active={showUserMenu}
                    aria-label={copy.accountMenu}
                  >
                    <User size={20} />
                  </IconButton>
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`absolute mt-4 w-60 max-w-[90vw] bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] z-[1001] border border-gray-100 overflow-hidden ${isRtl ? "left-0" : "right-0"}`}
                      >
                        <div className="py-2 px-1">
                          {isAuthenticated ? (
                            <>
                              <div className="px-4 py-3 border-b border-gray-50 mb-2 bg-gray-50/50">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                  {copy.authenticatedAccount}
                                </p>
                                <p className="text-[13px] font-bold text-gray-800 truncate">
                                  {user?.email}
                                </p>
                              </div>
                              <Link
                                href={
                                  user?.role === "CUSTOMER"
                                    ? "/profile"
                                    : user?.role === "VENDOR"
                                      ? "/vendor/profile"
                                      : "/admin/profile"
                                }
                                onClick={closeAll}
                                className="menu-link"
                              >
                                <User size={16} /> {copy.profile}
                              </Link>
                              <button
                                onClick={() => {
                                  router.push(
                                    user?.role === "CUSTOMER"
                                      ? "/orders"
                                      : "/vendor/orders",
                                  );
                                  closeAll();
                                }}
                                className="menu-link"
                              >
                                <ShoppingCart size={16} /> {copy.myOrders}
                              </button>
                              <div className="h-px bg-gray-100 my-2 mx-2" />
                              <button
                                onClick={handleLogout}
                                className="menu-link text-red-500 hover:bg-red-50"
                              >
                                {copy.signOut}
                              </button>
                            </>
                          ) : (
                            <div className="p-3">
                              <button
                                onClick={() => {
                                  router.push("/auth/login");
                                  closeAll();
                                }}
                                className="w-full py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                              >
                                {copy.accessAccount}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <IconButton
                  onClick={() => setIsCartOpen(true)}
                  badge={itemCount?.toString()}
                  aria-label={t("cartLabel")}
                >
                  <ShoppingBasket size={20} />
                </IconButton>
              </div>
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
        className="bg-primary text-white relative z-50 overflow-x-clip"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center h-14 sm:h-[68px]">
          {/* CATEGORIES BUTTON */}
          <div className="relative flex-shrink-0" ref={categoriesRef}>
            <button
              onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
              className={`flex items-center gap-1.5 sm:gap-3 font-bold h-14 sm:h-[68px] px-2 sm:px-6 lg:px-8 transition-all duration-300 cursor-pointer border-white/10 ${isRtl ? "border-l" : "border-r"} ${showCategoriesDropdown ? "bg-white text-primary shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]" : "bg-black/10 hover:bg-black/20"}`}
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
                  className={`absolute top-full w-[min(92vw,380px)] bg-white text-gray-800 rounded-b-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] z-[1001] border-x border-b border-gray-100 overflow-hidden max-h-[70vh] overflow-y-auto ${isRtl ? "right-0" : "left-0"}`}
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
          <div className="hidden lg:flex flex-1 items-center gap-6 lg:gap-8 px-6 lg:px-8 py-2 text-[14px] lg:text-[15px] font-bold">
            <Link href="/" className="nav-link-bottom">
              {copy.home}
            </Link>
            <Link href="/products" className="nav-link-bottom">
              {copy.products}
            </Link>
            <Link
              href="/gifts"
              className="nav-link-bottom relative flex items-center gap-2 group"
            >
              {copy.giftSets}
              <span
                className="text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm group-hover:scale-110 transition-transform"
                style={{ backgroundColor: "var(--yellow)" }}
              >
                {copy.new}
              </span>
            </Link>
            <Link href="/baby-packages" className="nav-link-bottom">
              {copy.babyCare}
            </Link>
            <Link
              href="/deals"
              className="nav-link-bottom flex items-center gap-1.5"
            >
              <Zap
                size={15}
                style={{ color: "var(--yellow)", fill: "var(--yellow)" }}
              />{" "}
              {copy.dailyDeals}
            </Link>
            <Link href="/contact" className="nav-link-bottom">
              {copy.support}
            </Link>
          </div>

          {/* Tablet - Limited Links */}
          <div className="hidden md:flex lg:hidden flex-1 min-w-0 px-2 py-2 overflow-visible">
            <div className="flex w-full min-w-max items-center gap-3 text-[13px] font-bold whitespace-nowrap">
              <Link href="/" className="nav-link-bottom px-2 whitespace-nowrap">
                {copy.home}
              </Link>
              <Link href="/products" className="nav-link-bottom px-2 whitespace-nowrap">
                {copy.products}
              </Link>
              <Link
                href="/gifts"
                className="nav-link-bottom px-2 relative flex items-center gap-1 whitespace-nowrap"
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
          <div className="flex md:hidden flex-1 min-w-0 px-1 py-2 overflow-visible">
            <div className="flex w-full min-w-0 items-center justify-between gap-1 pr-1 text-[10px] min-[360px]:text-[11px] font-bold whitespace-nowrap">
              <Link href="/" className="nav-link-bottom px-1 whitespace-nowrap shrink min-w-0">
                {copy.home}
              </Link>
              <Link href="/products" className="nav-link-bottom px-1 whitespace-nowrap shrink min-w-0">
                {copy.products}
              </Link>
              <Link
                href="/gifts"
                className="nav-link-bottom px-1 relative flex items-center gap-1 whitespace-nowrap shrink min-w-0"
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
          <div className="fixed inset-0 z-[1000] overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
            />
            {/* Sheet Side Panel */}
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute top-0 right-0 h-full w-full max-w-[440px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.25)] flex flex-col"
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

function CurrencySelector({ label, isRtl }: { label: string; isRtl: boolean }) {
  const [open, setOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const currencies: ("USD" | "AFN" | "EUR" | "CAD")[] = [
    "USD",
    "AFN",
    "EUR",
    "CAD",
  ];
  const ref = useRef<HTMLDivElement>(null);

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
        className={`h-11 px-4 rounded-full border flex items-center gap-2 text-[14px] font-bold transition-all cursor-pointer ${open ? "bg-white shadow-lg border-primary/30 text-primary" : "bg-gray-50/80 border-gray-100 hover:bg-white text-gray-600"}`}
      >
        <DollarSign
          size={14}
          className={`${open ? "text-primary" : "text-gray-400"}`}
        />
        <span className="mt-0.5">{currency}</span>
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
            className={`absolute mt-3 w-40 bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-100 z-[1001] overflow-hidden p-2 ${isRtl ? "left-0" : "right-0"}`}
          >
            <p className="px-4 py-2.5 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">
              {label}
            </p>
            {currencies.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCurrency(c);
                  setOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all cursor-pointer ${isRtl ? "text-right" : "text-left"} ${currency === c ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {c}
                {currency === c && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
        className={`h-11 px-3.5 rounded-full border flex items-center gap-2 text-sm font-bold transition-all cursor-pointer ${open ? "bg-white shadow-lg border-primary/30 text-primary" : "bg-gray-50/80 border-gray-100 hover:bg-white text-gray-600"}`}
      >
        <span className="text-lg w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-md border border-gray-100">
          {current.flag}
        </span>
        <span className="uppercase text-xs tracking-widest mt-0.5">
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
      className={`relative h-9 w-9 sm:h-11 sm:w-11 flex items-center justify-center rounded-full border transition-all duration-300 group active:scale-90 cursor-pointer ${active ? "bg-primary border-primary text-white shadow-xl shadow-primary/30" : "border-gray-100 bg-white hover:bg-gray-50 text-gray-600 hover:text-primary hover:border-primary/30"}`}
    >
      {children}
      {badge && (
        <span
          className={`absolute -top-1 -right-1 text-[10px] font-black min-w-5 h-5 flex items-center justify-center rounded-full ring-2 shadow-md transition-all ${active ? "bg-white text-primary ring-primary" : "bg-primary text-white ring-white"}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
