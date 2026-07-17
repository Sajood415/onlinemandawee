"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Baby,
  Banknote,
  ChevronDown,
  Flame,
  Gift,
  HelpCircle,
  LogOut,
  PackageSearch,
  Store,
  UserCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { headerCopy } from "@/components/layout/header/header-copy";
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

  const navLinks: Array<{
    href: string;
    label: string;
    icon: React.ReactNode;
    highlight?: boolean;
  }> = [
    {
      href: "/category/baby-care",
      label: copy.babyCare,
      icon: <Baby size={18} />,
    },
    { href: "/hawala", label: copy.hawalaShort, icon: <Banknote size={18} /> },
    { href: "/contact", label: copy.support, icon: <HelpCircle size={18} /> },
    { href: "/deals", label: copy.hot, icon: <Flame size={18} />, highlight: true },
    { href: "/gifts", label: copy.giftSets, icon: <Gift size={18} /> },
    { href: "/vendor/register", label: copy.sellOnPlatform, icon: <Store size={18} /> },
    { href: "/orders", label: copy.trackOrder, icon: <PackageSearch size={18} /> },
  ];

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

  return (
    <div className="relative flex h-9 shrink-0 items-center" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-2 text-[12px] font-medium whitespace-nowrap transition-colors after:absolute after:inset-x-2 after:bottom-0.5 after:h-[2px] after:rounded-full after:bg-[#ec1b23] after:transition-transform after:duration-200 ${
          surface === "light"
            ? isOpen
              ? "font-semibold text-[#ec1b23] after:scale-x-100"
              : "text-gray-600 after:scale-x-0 hover:text-gray-900 hover:after:scale-x-100"
            : isOpen
              ? "text-white after:scale-x-100"
              : "text-white/90 after:scale-x-0 hover:text-white hover:after:scale-x-100"
        }`}
      >
        <span>{copy.more}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute end-0 top-full z-[10050] mt-2 max-h-[min(70dvh,28rem)] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]"
            style={{ transformOrigin: isRtl ? "top left" : "top right" }}
          >
            <div className="p-2">
              {showLanguages ? (
                <div className="mb-2 border-b border-gray-100 px-1 pb-2">
                  <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {tAuth("languages.select")}
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {languages.map((language) => {
                      const active = locale === language.code;
                      return (
                        <button
                          key={language.code}
                          type="button"
                          onClick={() => {
                            router.replace(pathname, { locale: language.code });
                            setIsOpen(false);
                            closeAll();
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-[#ec1b23] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          <span aria-hidden>{language.flag}</span>
                          <span>{language.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {showCurrencies ? (
                <div className="mb-2 border-b border-gray-100 px-1 pb-2">
                  <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {tAuth("currencies.select")}
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {availableCurrencies.map((code) => {
                      const active = currency === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setCurrency(code as SupportedCurrency);
                            setIsOpen(false);
                            closeAll();
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-[#ec1b23] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          <span>{CURRENCY_SYMBOLS[code as SupportedCurrency]}</span>
                          <span>{code}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {isAuthenticated ? (
                <div className="mb-2 border-b border-gray-100 pb-2">
                  <p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {tAuth("accountMenu.label")}
                  </p>
                  <LocaleLink
                    href={accountHref}
                    onClick={() => {
                      setIsOpen(false);
                      closeAll();
                    }}
                    className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-all hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <UserCircle size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[14px] font-semibold text-gray-700">
                        {accountLabel}
                      </span>
                      {user?.fullName ? (
                        <span className="block truncate text-xs text-gray-500">
                          {user.fullName}
                        </span>
                      ) : null}
                    </div>
                  </LocaleLink>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                      closeAll();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <LogOut size={18} />
                    </div>
                    <span className="text-[14px] font-semibold text-red-600">
                      {tAuth("accountMenu.signOut")}
                    </span>
                  </button>
                </div>
              ) : null}

              <p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
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
                    className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-all hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                        link.highlight
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      {link.icon}
                    </div>
                    <span className="text-[14px] font-semibold text-gray-700">
                      {link.label}
                    </span>
                    {link.highlight ? (
                      <span
                        className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-black text-white"
                        style={{ backgroundColor: "var(--yellow)" }}
                      >
                        {copy.hot}
                      </span>
                    ) : null}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
