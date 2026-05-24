"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { usePathname, useRouter, Link as LocaleLink } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/store/auth-context";
import { useCart } from "@/store/cart-context";
import Link from "next/link";
import {
  Search,
  ShoppingBasket,
  ChevronDown,
  Menu,
  X,
  Cookie,
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
  UserCircle,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import productData from "@/data/product.json";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import {
  HEADER_BAR_CLASS,
  HEADER_LOGO_SRC,
  headerCopy,
} from "@/components/layout/header/header-copy";
import { IconButton } from "@/components/layout/header/IconButton";
import { LanguageSelector } from "@/components/layout/header/LanguageSelector";
import { MobileNavMenu } from "@/components/layout/header/MobileNavMenu";
import {
  localizeVendor,
  type SupportedLocale,
} from "@/lib/localization/product-vendor";
import { buildLoginRedirectPath } from "@/lib/auth/client-auth-routing";

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


export default function Header() {
  const t = useTranslations("Homepage.navbar");
  const pathname = usePathname();
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const copy = headerCopy[safeLocale];
  const isVendorRegisterPage = pathname.includes("/vendor/register");
  const isAuthSignupPage = pathname.includes("/auth/signup");
  const hideSecondaryNav =
    pathname.includes("/auth/login") ||
    pathname.includes("/auth/forgot-password") ||
    isAuthSignupPage ||
    isVendorRegisterPage;
  const { isAuthenticated, user, logout } = useAuth();
  const { cart, itemCount, total, removeItem, updateQuantity, refreshCart } = useCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    let mounted = true;
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/catalog/categories");
        if (!res.ok) return;
        const data = await parseApiResponse<{ id: string; name: string; slug: string }[]>(res);
        if (mounted) setCatalogCategories(data);
      } catch {
        // keep fallback hardcoded items
      }
    };
    void loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

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
  }, [charIndex, isDeleting, suggestionIndex, isSearchFocused, searchQuery, searchSuggestions]);

  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogin = () => {
    if (pathname.startsWith("/auth/")) {
      router.push("/auth/login");
      return;
    }
    router.push(buildLoginRedirectPath(pathname));
  };

  const closeAll = useCallback(() => {
    setShowCategoriesDropdown(false);
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
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setShowAccountMenu(false);
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
        className={`sticky top-0 z-[9998] overflow-x-visible overflow-y-visible border-b border-white/15 shadow-[0_4px_20px_rgba(15,52,96,0.35)] ${HEADER_BAR_CLASS}`}
      >
        <div className="mx-auto w-full min-w-0 max-w-7xl py-2 sm:py-3 ps-[max(0.375rem,env(safe-area-inset-left,0px))] pe-[max(0.375rem,env(safe-area-inset-right,0px))] sm:ps-[max(1rem,env(safe-area-inset-left,0px))] sm:pe-[max(1rem,env(safe-area-inset-right,0px))]">
          <div className="flex min-w-0 flex-nowrap items-center justify-between gap-2 sm:gap-3 md:max-lg:gap-2 lg:gap-4">
            {/* LOGO */}
            <Link href="/" className="flex-shrink-0 order-1">
              <Image
                src={HEADER_LOGO_SRC}
                alt="Mandawee"
                width={220}
                height={60}
                className="h-8 w-auto sm:h-9 md:h-10 lg:h-11 transition-opacity hover:opacity-90"
                priority
              />
            </Link>

            {/* SEARCH - Desktop & Tablet */}
            <form
              onSubmit={handleSearch}
              className={`group hidden md:flex order-2 h-11 min-w-0 max-w-3xl flex-1 items-center gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-sm transition-all duration-300 hover:bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 ${isRtl ? "pr-3 pl-1" : "pl-3 pr-1"}`}
            >
              <Search
                className="shrink-0 text-gray-400 transition-colors group-focus-within:text-primary"
                size={18}
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
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] lg:px-5 lg:text-sm"
              >
                <span>{copy.searchButton}</span>
                <Search className="h-4 w-4 text-white" strokeWidth={2.5} />
              </button>
            </form>

            {/* RIGHT ICONS - Integrated Professional Row */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 md:max-lg:gap-1.5 lg:gap-3 order-3">
              {/* Mobile Search Toggle */}
              <button
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                className="md:hidden h-9 w-9 flex items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Search size={19} />
              </button>

              {/* Language Selector - First */}
              <div className="hidden md:flex items-center">
                <LanguageSelector
                  locale={locale}
                  label={copy.languageSelect}
                  isRtl={isRtl}
                  variant="dark"
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
                accent="primary"
                surface="dark"
              >
                <ShoppingBasket size={20} />
              </IconButton>

              {/* Login / Account - Third */}
              {isAuthenticated ? (
                <div className="relative hidden md:block" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowAccountMenu((v) => !v)}
                    className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                    aria-label="Account menu"
                  >
                    <UserCircle size={18} />
                    <span className="max-w-[7rem] truncate">{user?.fullName?.split(" ")[0] ?? "Account"}</span>
                  </button>
                  {showAccountMenu && (
                    <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-neutral-200 bg-white py-1 shadow-xl z-50">
                      {user?.role === "ADMIN" && (
                        <LocaleLink
                          href="/admin/dashboard"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex w-full items-center px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          Admin dashboard
                        </LocaleLink>
                      )}
                      {user?.role === "VENDOR" && (
                        <LocaleLink
                          href="/vendor/dashboard"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex w-full items-center px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          Vendor dashboard
                        </LocaleLink>
                      )}
                      {user?.role === "CUSTOMER" && (
                        <LocaleLink
                          href="/account"
                          onClick={() => setShowAccountMenu(false)}
                          className="flex w-full items-center px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          My account
                        </LocaleLink>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowAccountMenu(false);
                        }}
                        className="flex w-full items-center px-4 py-2.5 text-sm text-red-600 hover:bg-neutral-50"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="hidden md:flex h-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 whitespace-nowrap text-xs font-semibold text-white transition-colors hover:bg-white/20 lg:px-4 lg:text-sm"
                >
                  {copy.login}
                </button>
              )}

              {/* Become a Vendor Button - Fourth */}
              <LocaleLink
                href="/vendor/register"
                className="hidden md:flex h-9 shrink-0 px-3 whitespace-nowrap lg:px-4 rounded-full text-white text-xs lg:text-sm font-semibold items-center justify-center transition-all shadow-sm bg-primary hover:brightness-110"
              >
                {copy.becomeVendor}
              </LocaleLink>
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
                  className="relative flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-sm"
                >
                  <Search className="ms-2 shrink-0 text-gray-400" size={18} />
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
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
                  >
                    <span>{copy.searchButton}</span>
                    <Search className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {hideSecondaryNav ? null : (
      <nav
        dir={isRtl ? "rtl" : "ltr"}
        className="relative z-[9997] overflow-x-clip border-b border-gray-200 bg-white text-gray-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
      >
        <div className="mx-auto flex h-12 w-full min-w-0 max-w-7xl items-center sm:h-14 ps-[max(0.375rem,env(safe-area-inset-left,0px))] pe-[max(0.375rem,env(safe-area-inset-right,0px))] sm:ps-[max(0.75rem,env(safe-area-inset-left,0px))] sm:pe-[max(0.75rem,env(safe-area-inset-right,0px))] md:ps-[max(1rem,env(safe-area-inset-left,0px))] md:pe-[max(1rem,env(safe-area-inset-right,0px))]">
          <div className="relative flex-shrink-0" ref={categoriesRef}>
            <button
              onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
              className={`flex items-center gap-1.5 sm:gap-2.5 font-bold h-12 sm:h-14 px-2 sm:px-5 lg:px-6 transition-all duration-300 cursor-pointer text-white border-gray-200 ${isRtl ? "border-l" : "border-r"} ${
                showCategoriesDropdown
                  ? "bg-primary/90 text-white shadow-inner"
                  : "bg-primary hover:brightness-110"
              }`}
            >
              <Menu size={18} />
              <span className="hidden leading-none sm:inline mt-0.5 tracking-tight">
                {copy.exploreCategories}
              </span>
              <ChevronDown
                size={14}
                className={`hidden sm:block transition-transform duration-300 opacity-90 text-white ${showCategoriesDropdown ? "rotate-180" : ""}`}
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

                    {catalogCategories.length > 0 ? (
                      <>
                        {catalogCategories.map((category, idx) => (
                          <CategoryItem
                            key={category.id}
                            href={`/category/${category.slug}`}
                            icon={<ShoppingBag size={18} />}
                            label={category.name}
                            onClick={closeAll}
                            showSeparator={idx > 0 && idx % 6 === 0}
                          />
                        ))}
                      </>
                    ) : (
                      <>
                        {/* Fallback categories */}
                        <CategoryItem
                          href="/category/breakfast"
                          icon={<Croissant size={18} />}
                          label={
                            safeLocale === "en"
                              ? "Breakfast Items"
                              : safeLocale === "ps"
                                ? "د ناشتې توکي"
                                : "اقلام صبحانه"
                          }
                          onClick={closeAll}
                        />
                        <CategoryItem
                          href="/category/grocery"
                          icon={<ShoppingBag size={18} />}
                          label={
                            safeLocale === "en"
                              ? "Edible Grocery"
                              : safeLocale === "ps"
                                ? "خوراکي توکي"
                                : "مواد خوراکی"
                          }
                          onClick={closeAll}
                        />
                        <CategoryItem
                          href="/category/snacks"
                          icon={<Cookie size={18} />}
                          label={
                            safeLocale === "en"
                              ? "Snack Bar"
                              : safeLocale === "ps"
                                ? "سنک بار"
                                : "اسنک بار"
                          }
                          onClick={closeAll}
                        />
                        <CategoryItem
                          href="/category/beverages"
                          icon={<Wine size={18} />}
                          label={
                            safeLocale === "en"
                              ? "Beverages"
                              : safeLocale === "ps"
                                ? "مشروبات"
                                : "نوشیدنی‌ها"
                          }
                          onClick={closeAll}
                        />
                        <CategoryItem
                          href="/category/fruits"
                          icon={<Cherry size={18} />}
                          label={
                            safeLocale === "en"
                              ? "Fruits"
                              : safeLocale === "ps"
                                ? "مېوې"
                                : "میوه‌ها"
                          }
                          onClick={closeAll}
                        />
                      </>
                    )}

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
          <div className="hidden lg:flex flex-1 items-center gap-2 px-5 py-1.5 text-[13px] lg:text-[14px] font-bold text-gray-900 lg:px-7">
            <Link
              href="/"
              className="inline-flex h-8 items-center rounded-md px-3 transition-all hover:bg-gray-100 hover:text-primary"
            >
              {copy.home}
            </Link>
            <Link
              href="/products"
              className="inline-flex h-8 items-center rounded-md px-3 transition-all hover:bg-gray-100 hover:text-primary"
            >
              {copy.products}
            </Link>
            <Link
              href="/gifts"
              className="inline-flex h-8 items-center rounded-md px-3 relative flex items-center gap-2 group transition-all hover:bg-gray-100 hover:text-primary"
            >
              {copy.giftSets}
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm group-hover:scale-110 transition-transform text-gray-900"
                style={{ backgroundColor: "var(--yellow)" }}
              >
                {copy.new}
              </span>
            </Link>
            <Link
              href="/baby-packages"
              className="inline-flex h-8 items-center rounded-md px-3 transition-all hover:bg-gray-100 hover:text-primary"
            >
              {copy.babyCare}
            </Link>
            <Link
              href="/deals"
              className="inline-flex h-8 items-center rounded-md px-3 flex items-center gap-1.5 transition-all hover:bg-gray-100 hover:text-primary"
            >
              <Zap
                size={15}
                style={{ color: "var(--yellow)", fill: "var(--yellow)" }}
              />{" "}
              {copy.dailyDeals}
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-8 items-center rounded-md px-3 transition-all hover:bg-gray-100 hover:text-primary"
            >
              {copy.support}
            </Link>
          </div>

          {/* Tablet - Limited Links */}
          <div className="hidden md:flex lg:hidden flex-1 min-w-0 px-2 py-1.5 overflow-visible">
            <div className="flex w-full min-w-max items-center gap-2 text-[13px] font-bold whitespace-nowrap text-gray-900">
              <Link href="/" className="inline-flex h-8 items-center rounded-md px-2 whitespace-nowrap transition-all hover:bg-gray-100 hover:text-primary">
                {copy.home}
              </Link>
              <Link href="/products" className="inline-flex h-8 items-center rounded-md px-2 whitespace-nowrap transition-all hover:bg-gray-100 hover:text-primary">
                {copy.products}
              </Link>
              <Link
                href="/gifts"
                className="inline-flex h-8 items-center rounded-md px-2 relative flex items-center gap-1 whitespace-nowrap transition-all hover:bg-gray-100 hover:text-primary"
              >
                {copy.gifts}
                <span
                  className="text-gray-900 text-[8px] px-1 py-0.5 rounded-full font-black uppercase tracking-tighter"
                  style={{ backgroundColor: "var(--yellow)" }}
                >
                  {copy.new}
                </span>
              </Link>
              <MobileNavMenu closeAll={closeAll} isRtl={isRtl} surface="light" />
            </div>
          </div>

          {/* Mobile - Limited Links + More Button */}
          <div className="flex md:hidden flex-1 min-w-0 px-1 py-1.5 overflow-visible">
            <div className="flex w-full min-w-0 items-center justify-between gap-1 pr-1 text-[10px] min-[360px]:text-[11px] font-bold whitespace-nowrap text-gray-900">
              <Link href="/" className="inline-flex h-7 items-center rounded-md px-1 whitespace-nowrap shrink min-w-0 transition-all hover:bg-gray-100 hover:text-primary">
                {copy.home}
              </Link>
              <Link href="/products" className="inline-flex h-7 items-center rounded-md px-1 whitespace-nowrap shrink min-w-0 transition-all hover:bg-gray-100 hover:text-primary">
                {copy.products}
              </Link>
              <Link
                href="/gifts"
                className="inline-flex h-7 items-center rounded-md px-1 relative flex items-center gap-1 whitespace-nowrap shrink min-w-0 transition-all hover:bg-gray-100 hover:text-primary"
              >
                {copy.gifts}
                <span
                  className="hidden min-[360px]:inline-flex text-gray-900 text-[8px] px-1 py-0.5 rounded-full font-black uppercase tracking-tighter"
                  style={{ backgroundColor: "var(--yellow)" }}
                >
                  {copy.new}
                </span>
              </Link>
              <MobileNavMenu closeAll={closeAll} isRtl={isRtl} surface="light" />
            </div>
          </div>
          </div>
        </nav>
      )}

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
                  <LocaleLink
                    href="/cart"
                    onClick={() => setIsCartOpen(false)}
                    className="w-full py-4 bg-gray-900 text-white rounded-full font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-all group"
                  >
                    {copy.viewFullBasket}
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </LocaleLink>
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
  showSeparator = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  showSeparator?: boolean;
}) {
  return (
    <>
      {showSeparator ? <div className="h-px bg-gray-100 my-2 mx-4" /> : null}
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
    </>
  );
}


