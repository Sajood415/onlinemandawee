"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  ChevronRight,
  Gift,
  HelpCircle,
  Home,
  Info,
  LogOut,
  Menu,
  PackageSearch,
  ShoppingBag,
  Store,
  Tag,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { headerCopy } from "@/components/layout/header/header-copy";
import { PortalOverlay } from "@/components/ui/PortalOverlay";
import { Link as LocaleLink, usePathname, useRouter } from "@/i18n/navigation";
import {
  CURRENCY_SYMBOLS,
  type SupportedCurrency,
} from "@/lib/currency/constants";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { useAuth } from "@/store/auth-context";
import { useCurrency } from "@/store/currency-context";

type MobileNavMenuProps = {
  closeAll: () => void;
  isRtl: boolean;
  surface?: "dark" | "light";
  languages?: Array<{ code: string; label: string; flag: string }>;
};

type NavLink = {
  href: string;
  label: string;
  icon: ReactNode;
  highlight?: boolean;
};

function getSecondaryNavLinks(copy: (typeof headerCopy)["en"]): NavLink[] {
  return [
    { href: "/", label: copy.home, icon: <Home size={18} strokeWidth={1.75} /> },
    {
      href: "/products",
      label: copy.products,
      icon: <ShoppingBag size={18} strokeWidth={1.75} />,
    },
    {
      href: "/deals",
      label: copy.hotDiscounts,
      icon: <Tag size={18} strokeWidth={1.75} />,
      highlight: true,
    },
    {
      href: "/orders",
      label: copy.trackOrder,
      icon: <PackageSearch size={18} strokeWidth={1.75} />,
    },
    {
      href: "/supply-request",
      label: copy.supplyRequest,
      icon: <PackageSearch size={18} strokeWidth={1.75} />,
    },
    { href: "/gifts", label: copy.gifts, icon: <Gift size={18} strokeWidth={1.75} /> },
    {
      href: "/hawala",
      label: copy.hawalaShort,
      icon: <Banknote size={18} strokeWidth={1.75} />,
    },
    { href: "/about", label: copy.aboutUs, icon: <Info size={18} strokeWidth={1.75} /> },
    {
      href: "/contact",
      label: copy.support,
      icon: <HelpCircle size={18} strokeWidth={1.75} />,
    },
  ];
}

export function MobileNavMenu({
  closeAll,
  isRtl,
  surface = "dark",
  languages = [],
}: MobileNavMenuProps) {
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const copy = headerCopy[safeLocale];
  const tAuth = useTranslations("Auth");
  const { isAuthenticated, user, logout } = useAuth();
  const { currency, availableCurrencies, setCurrency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = getSecondaryNavLinks(copy);

  const accountHref =
    user?.role === "ADMIN"
      ? "/admin/dashboard"
      : user?.role === "VENDOR"
        ? "/vendor/dashboard"
        : "/account";

  const accountLabel =
    user?.role === "ADMIN"
      ? tAuth("accountMenu.adminDashboard")
      : user?.role === "VENDOR"
        ? tAuth("accountMenu.vendorDashboard")
        : tAuth("accountMenu.myAccount");

  const showLanguages = languages.length > 1;
  const showCurrencies = availableCurrencies.length > 1;

  const closeMenu = () => {
    setIsOpen(false);
    closeAll();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-label={copy.more}
        className={`relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 text-[12px] font-medium whitespace-nowrap transition-colors ${
          surface === "light"
            ? isOpen
              ? "bg-gray-100 font-semibold text-primary"
              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            : isOpen
              ? "bg-white/10 text-white"
              : "text-white/90 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Menu size={18} strokeWidth={2} />
        <span className="hidden sm:inline">{copy.more}</span>
      </button>

      <PortalOverlay open={isOpen}>
        <motion.div
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[200000] flex flex-col bg-[#f7f8fb]"
          style={{
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100dvh",
            minHeight: "100svh",
            maxHeight: "100dvh",
          }}
          dir={isRtl ? "rtl" : "ltr"}
          role="dialog"
          aria-modal="true"
          aria-label={copy.more}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <h2 className="text-lg font-bold tracking-tight text-secondary">
              {copy.more}
            </h2>
            <button
              type="button"
              onClick={closeMenu}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200"
              aria-label={copy.close}
            >
              <X size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 sm:px-4">
            {showLanguages || showCurrencies ? (
              <section className="mb-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04] sm:p-3.5">
                {showLanguages ? (
                  <div className={showCurrencies ? "mb-3" : ""}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {tAuth("languages.select")}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {languages.map((language) => {
                        const active = locale === language.code;
                        return (
                          <button
                            key={language.code}
                            type="button"
                            onClick={() => {
                              router.replace(pathname, { locale: language.code });
                              closeMenu();
                            }}
                            className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center transition ${
                              active
                                ? "bg-primary text-white shadow-sm"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            <span className="text-base leading-none" aria-hidden>
                              {language.flag}
                            </span>
                            <span className="text-[11px] font-semibold leading-tight">
                              {language.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {showCurrencies ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                      {tAuth("currencies.select")}
                    </p>
                    <div className="flex gap-1.5">
                      {availableCurrencies.map((code) => {
                        const active = currency === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              setCurrency(code as SupportedCurrency);
                              closeMenu();
                            }}
                            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full px-1 py-2 text-[11px] font-semibold transition sm:text-xs ${
                              active
                                ? "bg-secondary text-white"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            <span>
                              {CURRENCY_SYMBOLS[code as SupportedCurrency]}
                            </span>
                            <span>{code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {isAuthenticated ? (
              <section className="mb-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
                <LocaleLink
                  href={accountHref}
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-3 py-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white">
                    {(user?.fullName?.trim().charAt(0) || "U").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900">
                      {user?.fullName || accountLabel}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {accountLabel}
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    className={`text-neutral-400 ${isRtl ? "rotate-180" : ""}`}
                  />
                </LocaleLink>
                <div className="border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm font-semibold text-red-600"
                  >
                    <LogOut size={16} />
                    {tAuth("accountMenu.signOut")}
                  </button>
                </div>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
              <p className="px-3 pb-0.5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                {copy.quickLinks}
              </p>
              <ul className="divide-y divide-neutral-100">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <LocaleLink
                      href={link.href}
                      onClick={closeMenu}
                      className="flex items-center gap-2.5 px-3 py-2.5 transition active:bg-neutral-50"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          link.highlight
                            ? "bg-amber-50 text-amber-600"
                            : "bg-[#eef1f6] text-secondary"
                        }`}
                      >
                        {link.icon}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-800">
                        {link.label}
                      </span>
                      {link.highlight ? (
                        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-900">
                          {copy.hot}
                        </span>
                      ) : null}
                      <ChevronRight
                        size={16}
                        className={`shrink-0 text-neutral-300 ${isRtl ? "rotate-180" : ""}`}
                      />
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <footer
            className="shrink-0 border-t border-neutral-200 bg-white px-3.5 pt-3 sm:px-4"
            style={{
              paddingBottom: "max(0.85rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <LocaleLink
              href="/vendor/register"
              onClick={closeMenu}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Store size={16} />
              {copy.sellOnPlatform}
            </LocaleLink>
          </footer>
        </motion.div>
      </PortalOverlay>
    </>
  );
}
