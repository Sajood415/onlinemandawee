"use client";

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
  Store,
  Gift,
  Banknote,
  HelpCircle,
  PackageSearch,
  ChevronRight,
  Heart,
  Home,
  Tag,
  Info,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import {
  HEADER_BAR_CLASS,
  headerCopy,
} from "@/components/layout/header/header-copy";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { CurrencySelector } from "@/components/layout/header/CurrencySelector";
import { LanguageSelector } from "@/components/layout/header/LanguageSelector";
import { usePlatformConfig } from "@/components/providers/PlatformConfigProvider";
import { CategoriesMegaMenu, type MegaMenuBrowseMode } from "@/components/layout/header/CategoriesMegaMenu";
import { HeaderSearchSuggest } from "@/components/layout/header/HeaderSearchSuggest";
import { MobileNavMenu } from "@/components/layout/header/MobileNavMenu";
import { resolveCategoryLabel } from "@/lib/categories/category-labels";
import { resolveCategoryFallbackImage } from "@/lib/categories/category-fallback-images";
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
    image: resolveCategoryFallbackImage(slug),
    children: [] as {
      id: string;
      slug: string;
      href: string;
      label: string;
      image?: string;
    }[],
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

function SecondaryNavLink({
  href,
  pathname,
  label,
  icon,
  badge,
  className = "",
  highlight = false,
}: {
  href: string;
  pathname: string;
  label: string;
  icon?: ReactNode;
  badge?: string;
  className?: string;
  highlight?: boolean;
}) {
  const active = isNavLinkActive(pathname, href);

  if (highlight) {
    return (
      <LocaleLink
        href={href}
        aria-current={active ? "page" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/15 lg:px-3 lg:text-[13px] ${className}`}
      >
        {badge ? (
          <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-bold uppercase leading-none text-white">
            {badge}
          </span>
        ) : null}
        {label}
        {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
      </LocaleLink>
    );
  }

  return (
    <LocaleLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 px-2 py-2 text-[12px] font-medium whitespace-nowrap transition-colors lg:gap-2 lg:px-2.5 lg:text-[13px] ${
        active
          ? "font-semibold text-primary"
          : "text-gray-600 hover:text-primary"
      } ${className}`}
    >
      {icon ? <span className="shrink-0 opacity-80">{icon}</span> : null}
      {label}
      {badge ? (
        <span className="rounded-full bg-amber-400 px-1 py-px text-[8px] font-bold uppercase text-gray-900">
          {badge}
        </span>
      ) : null}
    </LocaleLink>
  );
}

function HeaderUtilButton({
  label,
  icon,
  onClick,
  href,
  badge,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  badge?: number;
}) {
  const content = (
    <>
      <span className="relative flex h-9 w-9 items-center justify-center text-white">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-primary">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className="hidden text-[11px] font-medium text-white/85 xl:block">{label}</span>
    </>
  );

  const className =
    "group flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/10";

  if (href) {
    return (
      <LocaleLink href={href} className={className} aria-label={label}>
        {content}
      </LocaleLink>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-label={label}>
      {content}
    </button>
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
      image?: string;
      translations?: unknown;
      children?: {
        id: string;
        name: string;
        slug: string;
        image?: string;
        translations?: unknown;
      }[];
    }[]
  >([]);
  const [vendorCatalogCategories, setVendorCatalogCategories] = useState<
    {
      id: string;
      slug: string;
      name: string;
      href: string;
      image?: string;
      children: {
        id: string;
        slug: string;
        name: string;
        image?: string;
        href: string;
      }[];
    }[]
  >([]);
  const [megaBrowseMode, setMegaBrowseMode] = useState<MegaMenuBrowseMode>("platform");
  const [activePlatformMegaSlug, setActivePlatformMegaSlug] = useState<string | null>(null);
  const [activeVendorMegaSlug, setActiveVendorMegaSlug] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const platformCategoryItems = useMemo(() => {
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
        image: category.image,
        children: (category.children ?? []).map((child) => ({
          id: child.id,
          slug: child.slug,
          href: `/category/${child.slug}`,
          label: resolveCategoryLabel(child.slug, child.name, safeLocale, child.translations),
          image: child.image,
        })),
      }));
    }
    return getFallbackCategories(safeLocale);
  }, [catalogCategories, safeLocale]);

  const vendorCategoryItems = useMemo(
    () =>
      vendorCatalogCategories.map((category) => ({
        id: category.id,
        slug: category.slug,
        href: category.href,
        label: category.name,
        image: category.image,
        children: category.children.map((child) => ({
          id: child.id,
          slug: child.slug,
          href: child.href,
          label: child.name,
          image: child.image,
        })),
      })),
    [vendorCatalogCategories]
  );

  const megaCategoryItems =
    megaBrowseMode === "platform" ? platformCategoryItems : vendorCategoryItems;

  const activeMegaCategorySlug =
    megaBrowseMode === "platform" ? activePlatformMegaSlug : activeVendorMegaSlug;

  const setActiveMegaCategorySlug = (slug: string) => {
    if (megaBrowseMode === "platform") {
      setActivePlatformMegaSlug(slug);
      return;
    }
    setActiveVendorMegaSlug(slug);
  };

  const activeMegaCategory = useMemo(() => {
    if (megaCategoryItems.length === 0) return null;
    if (!activeMegaCategorySlug) return megaCategoryItems[0];
    return (
      megaCategoryItems.find((item) => item.slug === activeMegaCategorySlug) ??
      megaCategoryItems[0]
    );
  }, [activeMegaCategorySlug, megaCategoryItems]);

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
  const [showSearchSuggest, setShowSearchSuggest] = useState(false);

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
          {
            id: string;
            name: string;
            slug: string;
            image?: string;
            translations?: unknown;
            children?: {
              id: string;
              name: string;
              slug: string;
              image?: string;
              translations?: unknown;
            }[];
          }[]
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

  useEffect(() => {
    let mounted = true;
    const loadVendorCategories = async () => {
      try {
        const res = await fetch(`/api/catalog/vendor-categories?locale=${safeLocale}`);
        if (!res.ok) return;
        const data = await parseApiResponse<
          {
            id: string;
            slug: string;
            name: string;
            href: string;
            image?: string;
            children: {
              id: string;
              slug: string;
              name: string;
              image?: string;
              href: string;
            }[];
          }[]
        >(res);
        if (mounted) setVendorCatalogCategories(data);
      } catch {
        // keep empty vendor menu until API succeeds
      }
    };
    void loadVendorCategories();
    return () => {
      mounted = false;
    };
  }, [safeLocale]);

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
    if (pathname.includes("/search")) {
      setSearchQuery(searchParams.get("q") ?? searchParams.get("search") ?? "");
      return;
    }
    if (pathname.includes("/products")) {
      setSearchQuery(searchParams.get("search") ?? "");
    }
  }, [pathname, searchParams]);

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    setShowSearchSuggest(value.trim().length >= 2);
    if (pathname.includes("/search") && !value.trim()) {
      router.replace("/search");
      return;
    }
    if (pathname.includes("/products") && !value.trim()) {
      router.replace("/products");
    }
  };

  const submitSearch = useCallback(() => {
    const term = searchQuery.trim();
    setShowSearchSuggest(false);
    if (!term) {
      if (pathname.includes("/search")) {
        router.replace("/search");
      } else if (pathname.includes("/products")) {
        router.replace("/products");
      }
      return;
    }
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }, [pathname, router, searchQuery]);

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
    if (megaCategoryItems.length === 0) return;
    const firstSlug = megaCategoryItems[0].slug;
    if (megaBrowseMode === "platform") {
      setActivePlatformMegaSlug(firstSlug);
      return;
    }
    setActiveVendorMegaSlug(firstSlug);
  }, [showCategoriesDropdown, megaBrowseMode, megaCategoryItems]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Mega menu lives under header chrome; Categories trigger is in the white bar.
      if (
        headerWrapRef.current &&
        !headerWrapRef.current.contains(target)
      ) {
        setShowCategoriesDropdown(false);
      }
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(target)
      ) {
        setShowAccountMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const accountHref =
    user?.role === "ADMIN"
      ? "/admin/dashboard"
      : user?.role === "VENDOR"
        ? "/vendor/dashboard"
        : "/account";

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      handleLogin();
      return;
    }
    setShowAccountMenu((v) => !v);
  };

  return (
    <>
      <div ref={headerWrapRef} className="sticky top-0 z-[9998] shrink-0">
        {/* Red nav: logo on start (left in EN, right in PS/Dari), utils on end */}
        <header
          dir={isRtl ? "rtl" : "ltr"}
          className={`relative z-[9999] border-b border-black/10 shadow-[0_2px_12px_rgba(0,0,0,0.15)] ${HEADER_BAR_CLASS} ${
            showSearchSuggest ? "overflow-visible" : "overflow-x-clip overflow-y-visible"
          }`}
        >
          <div className="w-full min-w-0 px-2 py-2.5 sm:px-3 sm:py-3 lg:px-4">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 sm:gap-3 lg:gap-4">
              {/* Logo — start side: left in LTR, right in RTL */}
              <LocaleLink href="/" className="shrink-0">
                <BrandLogo
                  variant="light"
                  alt="Mandawee"
                  priority
                  className="h-9 w-auto sm:h-10 md:h-11"
                />
              </LocaleLink>

              {/* Pill search + live suggest */}
              <HeaderSearchSuggest
                variant="desktop"
                query={searchQuery}
                open={showSearchSuggest}
                onOpenChange={(open) => {
                  setShowSearchSuggest(open);
                  setIsSearchFocused(open);
                }}
                onQueryChange={handleSearchInputChange}
                onSubmitSearch={submitSearch}
                placeholder={
                  isSearchFocused || searchQuery
                    ? t("searchPlaceholder")
                    : placeholderText
                }
                searchButtonLabel={copy.searchButton}
                isRtl={isRtl}
              />

              {/* End side: Categories + lang/currency + utils (right in EN, left in PS/Dari) */}
              <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-3">
                {!hideSecondaryNavStrip ? (
                  <button
                    type="button"
                    onMouseEnter={() => setShowCategoriesDropdown(true)}
                    onClick={() => setShowCategoriesDropdown(true)}
                    className="hidden h-10 cursor-pointer items-center gap-2 rounded-2xl border border-white/90 bg-white px-3.5 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-white/95 md:inline-flex"
                  >
                    <Menu size={18} />
                    <span>{copy.categories}</span>
                  </button>
                ) : null}

                {!hideUtilityBar &&
                (languageOptions.length > 1 || availableCurrencies.length > 1) ? (
                  <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
                    {languageOptions.length > 1 ? (
                      <LanguageSelector
                        locale={locale}
                        label={tAuth("languages.select")}
                        isRtl={isRtl}
                        variant="pill"
                        languages={languageOptions}
                      />
                    ) : null}
                    <CurrencySelector isRtl={isRtl} variant="pill" />
                  </div>
                ) : null}

                <div className="hidden shrink-0 items-center gap-0.5 md:flex">
                  <div className="relative" ref={accountMenuRef}>
                    <HeaderUtilButton
                      label={copy.profile}
                      icon={<User size={20} strokeWidth={1.75} />}
                      onClick={handleProfileClick}
                    />
                    {isAuthenticated && showAccountMenu ? (
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
                  <HeaderUtilButton
                    label={copy.favorites}
                    icon={<Heart size={20} strokeWidth={1.75} />}
                    href={isAuthenticated ? accountHref : undefined}
                    onClick={isAuthenticated ? undefined : handleLogin}
                  />
                  <HeaderUtilButton
                    label={copy.cart}
                    icon={<ShoppingBasket size={20} strokeWidth={1.75} />}
                    onClick={() => setIsCartOpen(true)}
                    badge={itemCount}
                  />
                </div>

                <div className="flex items-center gap-1 md:hidden">
                  <MobileNavMenu
                    closeAll={closeAll}
                    isRtl={isRtl}
                    surface="dark"
                    languages={languageOptions}
                  />
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
                    aria-label={t("cartLabel")}
                  >
                    <ShoppingBasket size={22} strokeWidth={1.75} />
                    {itemCount > 0 ? (
                      <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-primary">
                        {itemCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
                    aria-label={copy.profile}
                  >
                    <User size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile search + live suggest */}
            <HeaderSearchSuggest
              variant="mobile"
              query={searchQuery}
              open={showSearchSuggest}
              onOpenChange={(open) => {
                setShowSearchSuggest(open);
                setIsSearchFocused(open);
              }}
              onQueryChange={handleSearchInputChange}
              onSubmitSearch={submitSearch}
              placeholder={
                isSearchFocused || searchQuery
                  ? copy.mobileSearchPlaceholder
                  : placeholderText
              }
              searchButtonLabel={copy.searchButton}
              isRtl={isRtl}
            />
          </div>
        </header>

        {hideSecondaryNavStrip ? null : (
          <nav
            dir={isRtl ? "rtl" : "ltr"}
            className="relative z-[9997] hidden border-b border-gray-100 bg-white md:block"
          >
            <div className="flex h-12 w-full items-center px-2 sm:px-3 lg:px-4">
              <div className="hidden min-w-0 flex-1 items-center justify-start gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:flex lg:gap-3 [&::-webkit-scrollbar]:hidden">
                <SecondaryNavLink
                  href="/"
                  pathname={pathname}
                  label={copy.home}
                  icon={<Home size={14} />}
                />
                <SecondaryNavLink
                  href="/products"
                  pathname={pathname}
                  label={copy.products}
                  icon={<ShoppingBag size={14} />}
                />
                <SecondaryNavLink
                  href="/deals"
                  pathname={pathname}
                  label={copy.hotDiscounts}
                  icon={<Tag size={13} />}
                  badge={copy.hot}
                  highlight
                />
                <SecondaryNavLink
                  href="/orders"
                  pathname={pathname}
                  label={copy.trackOrder}
                  icon={<PackageSearch size={14} />}
                />
                <SecondaryNavLink
                  href="/supply-request"
                  pathname={pathname}
                  label={copy.supplyRequest}
                  icon={<PackageSearch size={14} />}
                  className="hidden lg:inline-flex"
                />
                <SecondaryNavLink
                  href="/gifts"
                  pathname={pathname}
                  label={copy.gifts}
                  icon={<Gift size={14} />}
                  className="hidden xl:inline-flex"
                />
                <SecondaryNavLink
                  href="/hawala"
                  pathname={pathname}
                  label={copy.hawalaShort}
                  icon={<Banknote size={14} />}
                  className="hidden xl:inline-flex"
                />
                <SecondaryNavLink
                  href="/about"
                  pathname={pathname}
                  label={copy.aboutUs}
                  icon={<Info size={14} />}
                />

                <div className="ml-auto flex shrink-0 items-center gap-1 lg:gap-2">
                  <LocaleLink
                    href="/vendor/register"
                    className="inline-flex items-center px-2.5 py-2 text-[12px] font-semibold whitespace-nowrap text-primary transition-colors hover:text-primary/90 lg:text-[13px]"
                  >
                    {copy.sellOnPlatform}
                  </LocaleLink>
                  <SecondaryNavLink
                    href="/contact"
                    pathname={pathname}
                    label={copy.support}
                    icon={<HelpCircle size={14} />}
                    className="hidden xl:inline-flex"
                  />
                  <div className="xl:hidden">
                    <MobileNavMenu
                      closeAll={closeAll}
                      isRtl={isRtl}
                      surface="light"
                      languages={languageOptions}
                    />
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showCategoriesDropdown ? (
                <CategoriesMegaMenu
                  browseMode={megaBrowseMode}
                  onBrowseModeChange={setMegaBrowseMode}
                  categories={megaCategoryItems}
                  activeCategory={activeMegaCategory}
                  onSelectCategory={setActiveMegaCategorySlug}
                  onClose={closeAll}
                  isRtl={isRtl}
                  copy={copy}
                  getCategoryIcon={getCategoryIcon}
                  variants={dropdownVariants}
                />
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
                    className="rounded-2xl border border-secondary/15 bg-secondary/10 p-3"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <ShoppingBasket size={26} className="text-secondary" />
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
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-4 font-bold text-white shadow-lg transition-all hover:bg-[#0a2540]"
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

