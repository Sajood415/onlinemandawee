"use client";

import { usePathname } from "@/i18n/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

type PublicSiteLayoutProps = {
  children: React.ReactNode;
};

export function PublicSiteLayout({ children }: PublicSiteLayoutProps) {
  const pathname = usePathname();

  const isDashboardPage =
    pathname.includes("/admin/") || pathname.includes("/vendor/");
  const hidePublicLayout = isDashboardPage;

  if (hidePublicLayout) {
    return <main className="min-w-0 w-full flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="min-w-0 w-full flex-1">{children}</main>
      <Footer />
    </div>
  );
}
