"use client";

import { Suspense } from "react";
import { usePathname } from "@/i18n/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HEADER_BAR_CLASS } from "@/components/layout/header/header-copy";
import { isAuthPathname, isPortalPathname } from "@/lib/auth/client-auth-routing";

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
  const isPortal = isPortalPathname(pathname);
  const isAuth = isAuthPathname(pathname);

  if (isPortal) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        <main className="min-h-0 min-w-0 w-full flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  if (isAuth) {
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="min-w-0 w-full flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main className="min-w-0 w-full flex-1 overflow-x-hidden">{children}</main>
      <Footer />
    </div>
  );
}
