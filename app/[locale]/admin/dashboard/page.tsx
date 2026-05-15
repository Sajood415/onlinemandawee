"use client";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";

export default function AdminDashboardPage() {
  const { isLoading, user } = useDashboardGuard("ADMIN");

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-600">Loading...</p>
      </div>
    );
  }

  return <p className="text-2xl font-semibold tracking-tight text-[#0f3460]">Admin Dashboard</p>;
}
