"use client";

import { CustomerDashboardLayout } from "@/components/dashboard/CustomerDashboardLayout";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full min-h-0">
      <CustomerDashboardLayout>{children}</CustomerDashboardLayout>
    </div>
  );
}
