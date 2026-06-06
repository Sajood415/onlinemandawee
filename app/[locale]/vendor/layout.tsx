"use client";

import { VendorDashboardLayout } from "@/components/dashboard/VendorDashboardLayout";
import { usePathname } from "@/i18n/navigation";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isVendorRegisterPage = pathname.includes("/vendor/register");

  if (isVendorRegisterPage) {
    return <>{children}</>;
  }

  return (
    <div className="h-full min-h-0">
      <VendorDashboardLayout>{children}</VendorDashboardLayout>
    </div>
  );
}
