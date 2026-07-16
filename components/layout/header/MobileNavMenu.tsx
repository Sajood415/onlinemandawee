"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Baby, Banknote, ChevronDown, Flame, Gift, HelpCircle, LogOut, PackageSearch, Store, UserCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { headerCopy } from "@/components/layout/header/header-copy";
import { Link as LocaleLink } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { useAuth } from "@/store/auth-context";

type MobileNavMenuProps = {
  closeAll: () => void;
  isRtl: boolean;
  surface?: "dark" | "light";
};

export function MobileNavMenu({
  closeAll,
  isRtl,
  surface = "dark",
}: MobileNavMenuProps) {
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const copy = headerCopy[safeLocale];
  const tAuth = useTranslations("Auth");
  const { isAuthenticated, user, logout } = useAuth();
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
    { href: "/deals", label: copy.hot, icon: <Flame size={18} />, highlight: true },
    { href: "/gifts", label: copy.giftSets, icon: <Gift size={18} /> },
    { href: "/vendor/register", label: copy.sellOnPlatform, icon: <Store size={18} /> },
    { href: "/orders", label: copy.trackOrder, icon: <PackageSearch size={18} /> },
    { href: "/contact", label: copy.support, icon: <HelpCircle size={18} /> },
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

  return (
    <div className="relative flex h-9 shrink-0 items-center" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative inline-flex cursor-pointer items-center gap-1.5 px-3 py-2 text-[12px] font-medium whitespace-nowrap transition-colors after:absolute after:inset-x-2 after:bottom-0.5 after:h-[2px] after:rounded-full after:bg-[#ec1b23] after:transition-transform after:duration-200 ${
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
              {isAuthenticated ? (
                <div className="mb-2 border-b border-gray-100 pb-2">
                  <p className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    {tAuth("accountMenu.label")}
                  </p>
                  <LocaleLink
                    href={accountHref}
                    onClick={() => {
                      setIsOpen(false);
                      closeAll();
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all group"
                  >
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                      <UserCircle size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="block font-semibold text-gray-700 text-[14px]">
                        {accountLabel}
                      </span>
                      {user?.fullName ? (
                        <span className="block truncate text-xs text-gray-500">{user.fullName}</span>
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
                    className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-gray-50 active:bg-gray-100 transition-all"
                  >
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <LogOut size={18} />
                    </div>
                    <span className="font-semibold text-red-600 text-[14px]">
                      {tAuth("accountMenu.signOut")}
                    </span>
                  </button>
                </div>
              ) : null}

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
