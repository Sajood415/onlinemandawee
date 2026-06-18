"use client";

import { VendorDashboardLayout } from "@/components/dashboard/VendorDashboardLayout";
import { usePathname } from "@/i18n/navigation";
import { isVendorPublicRoute } from "@/lib/routing/vendor-public-routes";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isVendorPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="h-full min-h-0">
      <VendorDashboardLayout>{children}</VendorDashboardLayout>
    </div>
  );
}
