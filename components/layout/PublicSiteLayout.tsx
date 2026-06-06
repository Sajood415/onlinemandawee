"use client";

import { usePathname } from "@/i18n/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type PublicSiteLayoutProps = {
  children: React.ReactNode;
};

export function PublicSiteLayout({ children }: PublicSiteLayoutProps) {
  const pathname = usePathname();
  const isVendorRegisterPage = pathname.includes("/vendor/register");
  const isAccountPage = pathname.includes("/account");

  const isDashboardPage =
    pathname.includes("/admin/") ||
    (pathname.includes("/vendor/") && !isVendorRegisterPage);
  const hidePublicLayout = isDashboardPage;

  if (isAccountPage) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        <Header />
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
      <Header />
      <main className="min-w-0 w-full flex-1">{children}</main>
      <Footer />
    </div>
  );
}
