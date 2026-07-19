"use client";

import Image from "next/image";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { LogOut, PanelLeft, X } from "lucide-react";

import { useLocale, useTranslations } from "next-intl";

import { LanguageSelector } from "@/components/layout/header/LanguageSelector";
import { usePlatformConfig } from "@/components/providers/PlatformConfigProvider";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { HEADER_LOGO_SRC } from "@/components/layout/header/header-copy";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { useAuth } from "@/store/auth-context";

type DashboardNavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

type RoleDashboardLayoutProps = {
  topBarTitle: string;
  items: DashboardNavItem[];
  children: ReactNode;
};

const navScrollClass =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain flex flex-col divide-y divide-white/15 border-t border-white/10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20";

function parseNavHref(href: string) {
  const queryIndex = href.indexOf("?");
  if (queryIndex === -1) {
    return { path: href, query: null as URLSearchParams | null };
  }
  return {
    path: href.slice(0, queryIndex),
    query: new URLSearchParams(href.slice(queryIndex + 1)),
  };
}

function pathMatchesSidebarHref(pathname: string, path: string) {
  if (pathname === path || pathname.endsWith(path)) return true;
  if (/\/dashboard\/?$/.test(path)) return false;
  if (path === "/account") return false;
  const base = path.replace(/\/$/, "");
  return pathname.startsWith(`${base}/`);
}

function queryMatches(current: URLSearchParams, required: URLSearchParams) {
  return [...required.entries()].every(([key, value]) => current.get(key) === value);
}

function isSidebarItemActive(
  pathname: string,
  search: string,
  href: string,
  allHrefs: string[]
) {
  const { path, query } = parseNavHref(href);
  if (!pathMatchesSidebarHref(pathname, path)) return false;

  const current = new URLSearchParams(search.replace(/^\?/, ""));

  if (query && query.size > 0) {
    if (queryMatches(current, query)) return true;
    // Treat missing tab as the default sales report when that is the nav target.
    if (
      query.get("tab") === "salesByCategory" &&
      !current.get("tab") &&
      (path === "/admin/reports" || path.endsWith("/admin/reports"))
    ) {
      return true;
    }
    return false;
  }

  const moreSpecificMatch = allHrefs.some((otherHref) => {
    if (otherHref === href) return false;
    const other = parseNavHref(otherHref);
    if (other.path !== path || !other.query || other.query.size === 0) {
      return false;
    }
    return queryMatches(current, other.query);
  });

  return !moreSpecificMatch;
}

function RoleDashboardLayoutInner({
  topBarTitle,
  items,
  children,
}: RoleDashboardLayoutProps) {
  const t = useTranslations("Dashboard.shell");
  const tc = useTranslations("Common");
  const tAuth = useTranslations("Auth");
  const locale = useLocale() as SupportedLocale;
  const { availableLocales } = usePlatformConfig();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { logout } = useAuth();
  const isRtl = locale === "ps" || locale === "fa-AF";
  const search = searchParams.toString();
  const allHrefs = useMemo(() => items.map((item) => item.href), [items]);

  const languageOptions = useMemo(
    () =>
      [
        { code: "en", label: tAuth("languages.en"), flag: "🇺🇸" },
        { code: "ps", label: tAuth("languages.ps"), flag: "🇦🇫" },
        { code: "fa-AF", label: tAuth("languages.fa-AF"), flag: "🇦🇫" },
      ].filter((language) =>
        availableLocales.includes(language.code as SupportedLocale)
      ),
    [availableLocales, tAuth]
  );

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
    setOpen(false);
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="flex h-full min-h-0 w-full overflow-hidden bg-[#f3f6fb]"
    >
      <aside
        className={`flex h-full w-64 shrink-0 flex-col border-e border-white/10 bg-linear-to-b from-[#0f3460] to-[#123f74] py-4 text-white transition-transform duration-200 ease-out max-lg:fixed max-lg:inset-y-0 max-lg:start-0 max-lg:z-50 max-lg:max-w-[min(18rem,88vw)] ${
          open
            ? "max-lg:translate-x-0 max-lg:shadow-[4px_0_32px_rgba(15,52,96,0.25)] max-lg:rtl:shadow-[-4px_0_32px_rgba(15,52,96,0.25)]"
            : isRtl
              ? "max-lg:translate-x-full"
              : "max-lg:-translate-x-full"
        }`}
      >
        <div className="relative flex shrink-0 flex-col items-center border-b border-white/15 px-4 pb-6 pt-2">
          <button
            type="button"
            className="absolute end-3 top-3 rounded-lg p-2 text-white/85 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label={t("closeSidebar")}
          >
            <X className="h-5 w-5" />
          </button>
          <Link
            href="/"
            className="flex w-full justify-center px-2 py-2"
            onClick={() => setOpen(false)}
          >
            <Image
              src={HEADER_LOGO_SRC}
              alt={tc("brandName")}
              width={220}
              height={60}
              className="h-11 w-auto max-w-[90%] object-contain object-center sm:h-12"
              priority
            />
          </Link>
        </div>

        <nav className={navScrollClass}>
          {items.map((item) => {
            const active = isSidebarItemActive(pathname, search, item.href, allHrefs);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-4 px-5 py-4 text-sm [&_svg]:size-[18px] [&_svg]:shrink-0 ${
                  active
                    ? "bg-white/15 font-semibold text-white"
                    : "text-white"
                }`}
              >
                <span className="flex shrink-0 [&>svg]:block">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/20 px-3 pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t("logOut")}
          </button>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label={t("closeBackdrop")}
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex shrink-0 items-center gap-3 border-b border-neutral-200/80 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.06)] sm:px-5">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-sm lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={t("openSidebar")}
          >
            <PanelLeft className="h-5 w-5 stroke-2 rtl:rotate-180" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-[#0f3460] sm:text-lg lg:text-xl">
            {topBarTitle}
          </h1>
          {languageOptions.length > 1 ? (
            <div className="shrink-0">
              <LanguageSelector
                locale={locale}
                label={tAuth("languages.select")}
                isRtl={isRtl}
                variant="default"
                languages={languageOptions}
              />
            </div>
          ) : null}
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function RoleDashboardLayout(props: RoleDashboardLayoutProps) {
  return (
    <Suspense fallback={null}>
      <RoleDashboardLayoutInner {...props} />
    </Suspense>
  );
}
