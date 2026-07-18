"use client";

import Image from "next/image";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter, Link as LocaleLink } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/store/auth-context";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";
import {
  Search,
  ShoppingBasket,
  ShoppingCart,
  X,
  Cookie,
  ArrowRight,
  Croissant,
  ShoppingBag,
  Wine,
  Cherry,
  Baby,
  UserCircle,
  User,
  LogIn,
  Store,
  Phone,
  LayoutGrid,
  Percent,
  Flame,
  Gift,
  Banknote,
  HelpCircle,
  PackageSearch,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import {
  HEADER_BAR_CLASS,
  HEADER_LOGO_SRC,
  headerCopy,
} from "@/components/layout/header/header-copy";
import { CurrencySelector } from "@/components/layout/header/CurrencySelector";
import { LanguageSelector } from "@/components/layout/header/LanguageSelector";
import { usePlatformConfig } from "@/components/providers/PlatformConfigProvider";
import { MobileNavMenu } from "@/components/layout/header/MobileNavMenu";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import { isVendorShopPathname } from "@/lib/routing/vendor-storefront-routes";
import {
  localizeDelivery,
  localizeVendor,
  type SupportedLocale,
} from "@/lib/localization/product-vendor";
import { buildLoginRedirectPath } from "@/lib/auth/client-auth-routing";

// --- Framer Motion Configuration ---
const dropdownVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.08, ease: "linear" },
  },
  exit: { opacity: 0, transition: { duration: 0.08 } },
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

function getCategoryIcon(slug: string, size = 15) {
  const icons: Record<string, ReactNode> = {
    breakfast: <Croissant size={size} />,
    grocery: <ShoppingBag size={size} />,
    snacks: <Cookie size={size} />,
    beverages: <Wine size={size} />,
    fruits: <Cherry size={size} />,
    "baby-care": <Baby size={size} />,
  };
  return icons[slug] ?? <ShoppingBag size={size} />;
}

function getFallbackCategories(locale: SupportedLocale) {
  const labels: Record<string, Record<SupportedLocale, string>> = {
    breakfast: { en: "Breakfast Items", ps: "د ناشتې توکي", "fa-AF": "اقلام صبحانه" },
    grocery: { en: "Edible Grocery", ps: "خوراکي توکي", "fa-AF": "مواد خوراکی" },
    snacks: { en: "Snack Bar", ps: "سنک بار", "fa-AF": "اسنک بار" },
    beverages: { en: "Beverages", ps: "مشروبات", "fa-AF": "نوشیدنی‌ها" },
    fruits: { en: "Fruits", ps: "مېوې", "fa-AF": "میوه‌ها" },
  };

  return Object.entries(labels).map(([slug, localeLabels]) => ({
    id: slug,
    slug,
    href: `/category/${slug}`,
    label: localeLabels[locale],
    children: [],
  }));
}

function getCartSheetVariants(isRtl: boolean): Variants {
  if (!isRtl) return sheetVariants;
  return {
    hidden: { x: "-100%" },
    visible: {
      x: 0,
      transition: { type: "spring", damping: 30, stiffness: 300 },
    },
    exit: {
      x: "-100%",
      transition: { type: "spring", damping: 30, stiffness: 300 },
    },
  };
}

const localizeProductName = (
  _productId: string,
  fallbackName: string,
  _locale: SupportedLocale,
) => {
  return fallbackName;
};

function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/products") {
    return pathname === "/products" || pathname.startsWith("/products/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavDivider() {
  return <span className="mx-0.5 hidden h-4 w-px shrink-0 bg-gray-300 md:block" aria-hidden />;
}

function SecondaryNavLink({
  href,
  pathname,
  label,
  icon,
  badge,
  className = "",
}: {
  href: string;
  pathname: string;
  label: string;
  icon?: ReactNode;
  badge?: string;
  className?: string;
}) {
  const active = isNavLinkActive(pathname, href);

  return (
    <LocaleLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors sm:px-3 ${
        active
          ? "font-semibold text-[#ec1b23]"
          : "text-gray-600 hover:text-[#ec1b23]"
      } ${className}`}
    >
      {icon ? <span className="shrink-0 opacity-80">{icon}</span> : null}
      {label}
      {badge ? (
        <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-900">
          {badge}
        </span>
      ) : null}
    </LocaleLink>
  );
}

export default function Header() {
  const t = useTranslations("Homepage.navbar");
  const tAuth = useTranslations("Auth");
  const pathname = usePathname();
  const locale = useLocale() as SupportedLocale;
  const { availableLocales } = usePlatformConfig();
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const copy = headerCopy[safeLocale];
  const languageOptions = useMemo(
    () =>
      [
        { code: "en", label: tAuth("languages.en"), flag: "🇺🇸" },
        { code: "ps", label: tAuth("languages.ps"), flag: "🇦🇫" },
        { code: "fa-AF", label: tAuth("languages.fa-AF"), flag: "🇦🇫" },
      ].filter((language) => availableLocales.includes(language.code as SupportedLocale)),
    [availableLocales, tAuth]
  );
  const isVendorRegisterPage = pathname.includes("/vendor/register");
  const isAuthSignupPage = pathname.includes("/auth/signup");
  const hideUtilityBar =
    pathname.includes("/auth/login") ||
    pathname.includes("/auth/forgot-password") ||
    isAuthSignupPage ||
    isVendorRegisterPage;
  const hideSecondaryNavStrip =
    hideUtilityBar || isVendorShopPathname(pathname);
  const { isAuthenticated, user, logout } = useAuth();
  const { cart, itemCount, displayTotal, removeItem, updateQuantity, refreshCart } = useCart();
  const { currency, formatPrice, availableCurrencies } = useCurrency();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState<
    {
      id: string;
      name: string;
      slug: string;
      translations?: unknown;
      children?: {
        id: string;
        name: string;
        slug: string;
        translations?: unknown;
      }[];
    }[]
  >([]);
  const [activeMegaCategorySlug, setActiveMegaCategorySlug] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const categoryItems = useMemo(() => {
    if (catalogCategories.length > 0) {
      return catalogCategories.map((category) => ({
        id: category.id,
        slug: category.slug,
        href: `/category/${category.slug}`,
        label: resolveCategoryLabel(
          category.slug,
          category.name,
          safeLocale,
          category.translations,
        ),
        children: (category.children ?? []).map((child) => ({
          id: child.id,
          slug: child.slug,
          href: `/category/${child.slug}`,
          label: resolveCategoryLabel(child.slug, child.name, safeLocale, child.translations),
        })),
      }));
    }
    return getFallbackCategories(safeLocale);
  }, [catalogCategories, safeLocale]);

  const activeMegaCategory = useMemo(() => {
    if (categoryItems.length === 0) return null;
    if (!activeMegaCategorySlug) return categoryItems[0];
    return categoryItems.find((item) => item.slug === activeMegaCategorySlug) ?? categoryItems[0];
  }, [activeMegaCategorySlug, categoryItems]);

  const megaRelatedCategories = useMemo(() => {
    if (!activeMegaCategory) return [];
    return categoryItems.filter((item) => item.slug !== activeMegaCategory.slug);
  }, [activeMegaCategory, categoryItems]);

  const megaRelatedColumns = useMemo(() => {
    const perColumn = Math.max(4, Math.ceil(megaRelatedCategories.length / 2));
    return [
      megaRelatedCategories.slice(0, perColumn),
      megaRelatedCategories.slice(perColumn, perColumn * 2),
    ].filter((column) => column.length > 0);
  }, [megaRelatedCategories]);

  const cartSheetVariants = useMemo(() => getCartSheetVariants(isRtl), [isRtl]);

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
  const headerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headerWrapRef.current;
    if (!el) return;

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--header-height",
        `${el.offsetHeight}px`,
      );
    };

    syncHeaderHeight();
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(el);
    window.addEventListener("resize", syncHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderHeight);
    };
  }, [hideSecondaryNavStrip]);

  useEffect(() => {
    let mounted = true;
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/catalog/categories");
        if (!res.ok) return;
        const data = await parseApiResponse<
          { id: string; name: string; slug: string; translations?: unknown }[]
        >(res);
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
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname.includes("/products")) return;
    setSearchQuery(searchParams.get("search") ?? "");
  }, [pathname, searchParams]);

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (pathname.includes("/products") && !value.trim()) {
      router.replace("/products");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchQuery.trim();
    if (!term) {
      if (pathname.includes("/products")) {
        router.replace("/products");
      }
      return;
    }
    router.push(`/products?search=${encodeURIComponent(term)}`);
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
    setShowAccountMenu(false);
  }, []);

  useEffect(() => {
    if (!showCategoriesDropdown) return;
    if (categoryItems.length === 0) return;
    setActiveMegaCategorySlug((current) => current ?? categoryItems[0].slug);
  }, [showCategoriesDropdown, categoryItems]);

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
      <div ref={headerWrapRef} className="sticky top-0 z-[9998] shrink-0">
        {/* Utility bar */}
        {!hideUtilityBar ? (
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className="hidden border-b border-gray-200 bg-[#f7f8fa] sm:block"
          >
            <div className="flex h-9 w-full items-center justify-between px-2 text-[11px] text-gray-600 sm:px-3 lg:px-4">
              <div className="flex items-center gap-2 font-medium">
                <span className="text-gray-800">{copy.welcome}</span>
                <span className="hidden text-gray-300 lg:inline">|</span>
                <a
                  href="tel:+93799899856"
                  className="hidden items-center gap-1.5 text-gray-600 transition-colors hover:text-primary lg:inline-flex"
                >
                  <Phone size={12} />
                  <span>(+93) 799 899856</span>
                </a>
              </div>
              <div className="flex items-center gap-1">
                {languageOptions.length > 1 || availableCurrencies.length > 1 ? (
                  <div className="flex items-center gap-1">
                    {languageOptions.length > 1 ? (
                      <LanguageSelector
                        locale={locale}
                        label={tAuth("languages.select")}
                        isRtl={isRtl}
                        variant="default"
                        languages={languageOptions}
                      />
                    ) : null}
                    <CurrencySelector isRtl={isRtl} variant="default" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Main header */}
        <header
          dir={isRtl ? "rtl" : "ltr"}
          className={`relative z-[9999] overflow-x-clip overflow-y-visible border-b border-black/10 shadow-[0_2px_12px_rgba(0,0,0,0.15)] ${HEADER_BAR_CLASS}`}
        >
          <div className="w-full min-w-0 px-2 py-2.5 sm:px-3 sm:py-3 lg:px-4">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 sm:gap-3 lg:gap-4">
              <LocaleLink href="/" className="order-1 shrink-0">
                <Image
                  src={HEADER_LOGO_SRC}
                  alt="Mandawee"
                  width={220}
                  height={60}
                  className="h-8 w-auto sm:h-9 md:h-10 transition-opacity hover:opacity-90"
                  priority
                />
              </LocaleLink>

              <form
                onSubmit={handleSearch}
                className={`group order-2 hidden h-11 min-w-0 max-w-2xl flex-1 items-center rounded-lg border border-gray-200 bg-[#f0f0f1] transition-all duration-200 focus-within:border-primary/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10 md:flex ${isRtl ? "pr-4 pl-1.5" : "pl-4 pr-1.5"}`}
              >
                <input
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={
                    isSearchFocused || searchQuery
                      ? t("searchPlaceholder")
                      : placeholderText
                  }
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white hover:text-primary"
                  aria-label={copy.searchButton}
                >
                  <Search size={18} />
                </button>
              </form>

              <div className="order-3 ms-auto flex shrink-0 items-center gap-0.5 sm:gap-2 lg:gap-3">
                <div className="md:hidden">
                  <MobileNavMenu
                    closeAll={closeAll}
                    isRtl={isRtl}
                    surface="dark"
                    languages={languageOptions}
                  />
                </div>

                {isAuthenticated ? (
                  <div className="relative" ref={accountMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowAccountMenu((v) => !v)}
                      className={`group flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/10 sm:px-2 ${showAccountMenu ? "bg-white/10" : ""}`}
                      aria-label={tAuth("accountMenu.label")}
                      aria-expanded={showAccountMenu}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors group-hover:bg-white/20">
                        <User size={18} />
                      </div>
                      <div className="hidden min-w-0 text-start lg:block">
                        <p className="truncate text-xs font-bold text-white">
                          {user?.fullName?.split(" ")[0] ?? copy.account}
                        </p>
                        <p className="truncate text-[11px] text-white/75">
                          {copy.account}
                        </p>
                      </div>
                    </button>
                    {showAccountMenu ? (
                      <div className="absolute end-0 top-full z-[10001] mt-2 w-52 rounded-xl border border-neutral-200 bg-white py-1 shadow-xl">
                        {user?.role === "ADMIN" ? (
                          <LocaleLink
                            href="/admin/dashboard"
                            onClick={() => setShowAccountMenu(false)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                          >
                            <Store size={16} />
                            {tAuth("accountMenu.adminDashboard")}
                          </LocaleLink>
                        ) : null}
                        {user?.role === "VENDOR" ? (
                          <LocaleLink
                            href="/vendor/dashboard"
                            onClick={() => setShowAccountMenu(false)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                          >
                            <Store size={16} />
                            {tAuth("accountMenu.vendorDashboard")}
                          </LocaleLink>
                        ) : null}
                        {user?.role === "CUSTOMER" ? (
                          <LocaleLink
                            href="/account"
                            onClick={() => setShowAccountMenu(false)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                          >
                            <UserCircle size={16} />
                            {tAuth("accountMenu.myAccount")}
                          </LocaleLink>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setShowAccountMenu(false);
                          }}
                          className="flex w-full items-center px-4 py-2.5 text-sm text-red-600 hover:bg-neutral-50"
                        >
                          {tAuth("accountMenu.signOut")}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="group hidden min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-white/90 bg-white px-3 py-2 shadow-sm transition-all hover:bg-white/95 sm:inline-flex"
                    aria-label={copy.loginRegister}
                  >
                    <LogIn size={15} className="shrink-0 text-[#ec1b23]" />
                    <span className="truncate text-xs font-bold text-[#ec1b23]">
                      {copy.loginRegister}
                    </span>
                  </button>
                )}

                {!isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 sm:hidden"
                    aria-label={copy.loginRegister}
                  >
                    <User size={18} />
                  </button>
                ) : null}

                <div className="hidden h-8 w-px bg-white/25 sm:block" />

                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="group relative flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/10 sm:px-2"
                  aria-label={t("cartLabel")}
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors group-hover:bg-white/20">
                    <ShoppingCart size={18} />
                    {itemCount > 0 ? (
                      <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-[#ec1b23]">
                        {itemCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="hidden min-w-0 text-start lg:block">
                    <p className="truncate text-xs font-bold text-white">
                      {copy.cart}
                    </p>
                    <p className="truncate text-[11px] text-white/75">
                      {itemCount > 0
                        ? `${itemCount} ${copy.itemsReady}`
                        : copy.startShopping}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Always-visible mobile search — Digikala/Naheed pattern */}
            <form
              onSubmit={handleSearch}
              className={`relative mt-2 flex h-10 items-center rounded-lg border border-white/20 bg-white px-3 md:hidden ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <Search className="shrink-0 text-gray-400" size={17} />
              <input
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder={
                  isSearchFocused || searchQuery
                    ? copy.mobileSearchPlaceholder
                    : placeholderText
                }
                className="min-w-0 flex-1 bg-transparent px-2 text-[14px] font-medium text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-bold text-[#ec1b23]"
              >
                {copy.searchButton}
              </button>
            </form>
          </div>
        </header>

        {hideSecondaryNavStrip ? null : (
          <nav
            ref={categoriesRef}
            dir={isRtl ? "rtl" : "ltr"}
            className="relative z-[9997] hidden border-b border-gray-200 bg-white md:block"
            onMouseLeave={() => setShowCategoriesDropdown(false)}
          >
            <div className="flex h-11 w-full items-center gap-2 px-2 sm:px-3 lg:px-4">
              <LocaleLink
                href="/orders"
                className="hidden shrink-0 items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-100 lg:inline-flex"
              >
                <PackageSearch size={14} />
                <span>{copy.trackOrder}</span>
              </LocaleLink>

              {/* Desktop / tablet secondary nav — mobile uses bottom bar */}
              <div className="hidden min-w-0 flex-1 items-center md:flex">
                <button
                  type="button"
                  onMouseEnter={() => setShowCategoriesDropdown(true)}
                  onClick={() => setShowCategoriesDropdown(true)}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-2 px-2 py-2 text-sm font-bold transition-colors sm:px-3 ${
                    showCategoriesDropdown
                      ? "text-[#ec1b23]"
                      : "text-gray-800 hover:text-[#ec1b23]"
                  }`}
                >
                  <LayoutGrid size={17} />
                  <span>{copy.categories}</span>
                </button>

                <NavDivider />

                <SecondaryNavLink
                  href="/deals"
                  pathname={pathname}
                  label={copy.hot}
                  icon={<Percent size={15} />}
                />
                <NavDivider />
                <SecondaryNavLink
                  href="/products"
                  pathname={pathname}
                  label={copy.products}
                  icon={<ShoppingBag size={15} />}
                />
                <NavDivider />
                <SecondaryNavLink
                  href="/vendors"
                  pathname={pathname}
                  label={copy.vendors}
                  icon={<Store size={15} />}
                />
                <NavDivider />
                <SecondaryNavLink
                  href="/gifts"
                  pathname={pathname}
                  label={copy.gifts}
                  icon={<Gift size={15} />}
                  badge={copy.new}
                />
                <NavDivider />
                <SecondaryNavLink
                  href="/category/baby-care"
                  pathname={pathname}
                  label={copy.babyCare}
                  icon={<Baby size={15} />}
                  className="hidden lg:inline-flex"
                />
                <NavDivider />
                <SecondaryNavLink
                  href="/hawala"
                  pathname={pathname}
                  label={copy.hawalaShort}
                  icon={<Banknote size={15} />}
                  className="hidden xl:inline-flex"
                />
                <NavDivider />
                <SecondaryNavLink
                  href="/contact"
                  pathname={pathname}
                  label={copy.support}
                  icon={<HelpCircle size={15} />}
                  className="hidden xl:inline-flex"
                />

                <div className="ms-auto hidden items-center xl:flex">
                  <NavDivider />
                  <LocaleLink
                    href="/vendor/register"
                    className="inline-flex items-center px-3 py-2 text-[13px] font-semibold text-[#ec1b23] transition-colors hover:text-[#c4161d]"
                  >
                    {copy.sellOnPlatform}
                  </LocaleLink>
                </div>

                <div className="ms-auto xl:hidden">
                  <MobileNavMenu
                    closeAll={closeAll}
                    isRtl={isRtl}
                    surface="light"
                    languages={languageOptions}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showCategoriesDropdown ? (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute inset-x-0 top-full z-[9999] border-t border-gray-200 bg-white shadow-2xl"
                >
                  <div
                    className="flex w-full min-h-0 flex-col px-2 py-3 sm:px-3 lg:px-4"
                    style={{ height: "min(520px, calc(100dvh - var(--header-height) - 8px))" }}
                  >
                      <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            {copy.storeDepartments}
                          </p>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {copy.exploreCategories}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={closeAll}
                          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                          aria-label={copy.close}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div
                        className={`min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${
                          isRtl ? "flex flex-row-reverse" : "flex"
                        }`}
                      >
                        <aside
                          className={`h-full w-56 shrink-0 overflow-y-auto bg-[#fafafa] py-2 ${
                            isRtl ? "border-l border-gray-200" : "border-r border-gray-200"
                          }`}
                        >
                          {categoryItems.map((category) => {
                            const isActive = activeMegaCategory?.slug === category.slug;
                            return (
                              <button
                                key={category.id}
                                type="button"
                                onMouseEnter={() => setActiveMegaCategorySlug(category.slug)}
                                onFocus={() => setActiveMegaCategorySlug(category.slug)}
                                onClick={() => setActiveMegaCategorySlug(category.slug)}
                                className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                                  isRtl ? "text-right" : "text-left"
                                } ${
                                  isActive
                                    ? "bg-white font-semibold text-[#ec1b23]"
                                    : "text-gray-700 hover:bg-white hover:text-gray-900"
                                }`}
                              >
                                <span className="shrink-0 text-gray-500">
                                  {getCategoryIcon(category.slug, 16)}
                                </span>
                                <span className="line-clamp-1">{category.label}</span>
                              </button>
                            );
                          })}
                        </aside>

                        <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-5">
                          {activeMegaCategory ? (
                            <>
                              <div className="mb-4 border-b border-gray-100 pb-3">
                                <LocaleLink
                                  href={activeMegaCategory.href}
                                  onClick={closeAll}
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f3460] hover:text-[#ec1b23]"
                                >
                                  <span>{copy.megaAllIn}</span>
                                  <span>{activeMegaCategory.label}</span>
                                  <ChevronRight size={14} />
                                </LocaleLink>
                              </div>

                              <div
                                className={`grid grid-cols-1 gap-6 ${
                                  activeMegaCategory.children.length > 0
                                    ? "md:grid-cols-3"
                                    : "md:grid-cols-2"
                                }`}
                              >
                                {activeMegaCategory.children.length > 0 ? (
                                  <div>
                                    <h4 className="mb-3 text-sm font-bold text-gray-900">
                                      {copy.megaSubcategories}
                                    </h4>
                                    <div className="space-y-2">
                                      {activeMegaCategory.children.map((child) => (
                                        <LocaleLink
                                          key={child.id}
                                          href={child.href}
                                          onClick={closeAll}
                                          className="block text-sm text-gray-600 transition-colors hover:text-[#ec1b23]"
                                        >
                                          {child.label}
                                        </LocaleLink>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {megaRelatedColumns.map((column, index) => (
                                  <div key={`mega-related-col-${index}`}>
                                    <h4 className="mb-3 text-sm font-bold text-gray-900">
                                      {copy.megaRelatedCategories}
                                    </h4>
                                    <div className="space-y-2">
                                      {column.map((item) => (
                                        <LocaleLink
                                          key={item.id}
                                          href={item.href}
                                          onClick={closeAll}
                                          className="block text-sm text-gray-600 transition-colors hover:text-[#ec1b23]"
                                        >
                                          {item.label}
                                        </LocaleLink>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </nav>
        )}
      </div>

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
              variants={cartSheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`fixed top-0 z-[1000000] flex h-screen w-full max-w-[min(100vw,440px)] flex-col bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.25)] ${
                isRtl ? "left-0 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.25)]" : "right-0"
              }`}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white p-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="rounded-2xl border border-[#0F3460]/15 bg-[#0F3460]/10 p-3"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <ShoppingBasket size={26} className="text-[#0F3460]" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-black leading-none tracking-tight text-neutral-900">
                      {copy.yourBasket}
                    </h2>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
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
                      <LocaleLink
                        href="/products"
                        onClick={() => setIsCartOpen(false)}
                        className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-white rounded-full font-bold shadow-[0_10px_30px_-5px_rgba(220,53,69,0.4)] hover:shadow-[0_15px_40px_-5px_rgba(220,53,69,0.5)] hover:-translate-y-0.5 active:scale-95 transition-all"
                      >
                        <Search size={18} />
                        {copy.browseProducts}
                      </LocaleLink>
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
                          <CatalogImage
                            src={item.productImage}
                            alt={localizeProductName(
                              item.productId,
                              item.productName,
                              safeLocale,
                            )}
                            fill
                            sizes="80px"
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
                          {item.delivery ? (
                            <p className="mt-1 text-[11px] font-medium text-emerald-600">
                              {localizeDelivery(item.delivery, safeLocale)}
                            </p>
                          ) : null}
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-gray-900">
                              {formatPrice(
                                item.productPrice,
                                item.productCurrency ?? "USD"
                              )}
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
                      {formatPrice(displayTotal, currency)}
                    </span>
                  </div>
                  <LocaleLink
                    href="/cart"
                    onClick={() => setIsCartOpen(false)}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#0F3460] py-4 font-bold text-white shadow-lg transition-all hover:bg-[#0a2540]"
                  >
                    {copy.viewFullBasket}
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
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

function CategoryTile({
  href,
  slug,
  label,
  onClick,
}: {
  href: string;
  slug: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <LocaleLink
      href={href}
      onClick={onClick}
      className="group flex flex-col items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-center transition-all hover:border-[#ec1b23]/20 hover:bg-white hover:shadow-md"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#ec1b23] shadow-sm ring-1 ring-gray-100 transition-transform group-hover:scale-105">
        {getCategoryIcon(slug, 20)}
      </span>
      <span className="line-clamp-2 text-xs font-medium leading-snug text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
    </LocaleLink>
  );
}


