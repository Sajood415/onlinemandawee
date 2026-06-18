"use client";

import { Suspense } from "react";
import { usePathname } from "@/i18n/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HEADER_BAR_CLASS } from "@/components/layout/header/header-copy";
import { isVendorPublicRoute } from "@/lib/routing/vendor-public-routes";

type PublicSiteLayoutProps = {
  children: React.ReactNode;
};

function HeaderFallback() {
  return (
    <header
      aria-hidden
      className={`sticky top-0 z-[9998] h-14 sm:h-16 ${HEADER_BAR_CLASS}`}
    />
  );
}

export function PublicSiteLayout({ children }: PublicSiteLayoutProps) {
  const pathname = usePathname();
  const isVendorPublicPage = isVendorPublicRoute(pathname);
  const isAccountPage = pathname.includes("/account");

  const isDashboardPage =
    pathname.includes("/admin/") ||
    (pathname.includes("/vendor/") && !isVendorPublicPage);
  const hidePublicLayout = isDashboardPage;

  if (isAccountPage) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>
        <main className="min-h-0 min-w-0 w-full flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  if (hidePublicLayout) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        <main className="min-h-0 min-w-0 w-full flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main className="min-w-0 w-full flex-1">{children}</main>
      <Footer />
    </div>
  );
}
