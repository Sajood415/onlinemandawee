"use client";

import { Banknote, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useLocale } from "next-intl";

import { headerCopy } from "@/components/layout/header/header-copy";
import { Link, usePathname } from "@/i18n/navigation";
import { buildLoginRedirectPath } from "@/lib/auth/client-auth-routing";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { useAuth } from "@/store/auth-context";
import { useCart } from "@/store/cart-context";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const locale = useLocale() as SupportedLocale;
  const safeLocale: SupportedLocale =
    locale === "ps" || locale === "fa-AF" ? locale : "en";
  const isRtl = safeLocale !== "en";
  const copy = headerCopy[safeLocale];
  const { isAuthenticated, user } = useAuth();
  const { itemCount } = useCart();

  const accountHref = !isAuthenticated
    ? buildLoginRedirectPath(pathname)
    : user?.role === "ADMIN"
      ? "/admin/dashboard"
      : user?.role === "VENDOR"
        ? "/vendor/dashboard"
        : "/account";

  const items = [
    {
      href: "/",
      label: copy.home,
      icon: Home,
      match: (path: string) => isActivePath(path, "/"),
    },
    {
      href: "/products",
      label: copy.categories,
      icon: LayoutGrid,
      match: (path: string) =>
        path.startsWith("/products") || path.startsWith("/category"),
    },
    {
      href: "/cart",
      label: copy.cart,
      icon: ShoppingCart,
      match: (path: string) => isActivePath(path, "/cart"),
      badge: itemCount,
    },
    {
      href: "/hawala",
      label: copy.hawalaShort,
      icon: Banknote,
      match: (path: string) => isActivePath(path, "/hawala"),
    },
    {
      href: accountHref,
      label: copy.account,
      icon: User,
      match: (path: string) =>
        path.startsWith("/account") ||
        path.startsWith("/auth/") ||
        path.startsWith("/admin") ||
        path.startsWith("/vendor/dashboard"),
    },
  ] as const;

  return (
    <nav
      dir={isRtl ? "rtl" : "ltr"}
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-[9990] border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-between px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          const badge = "badge" in item ? item.badge : 0;

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={`relative flex h-full flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                  active ? "text-[#ec1b23]" : "text-gray-500"
                }`}
              >
                <span className="relative inline-flex">
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 2}
                    className={active ? "text-[#ec1b23]" : "text-gray-500"}
                  />
                  {badge && badge > 0 ? (
                    <span className="absolute -end-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ec1b23] px-1 text-[9px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`max-w-full truncate text-[10px] leading-tight ${
                    active ? "font-semibold text-[#ec1b23]" : "font-medium text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
