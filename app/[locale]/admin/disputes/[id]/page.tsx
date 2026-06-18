"use client";

import { RefundCaseDetailView } from "@/components/refunds/RefundCaseDetailView";
import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { AdminDashboardLayout } from "@/components/dashboard/AdminDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";

export default function AdminDisputeDetailPage() {
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const { isLoading } = useDashboardGuard("ADMIN");

  if (isLoading) return <PageLoader />;

  return (
    <AdminDashboardLayout>
      <RefundCaseDetailView
        refundCaseId={params.id}
        locale={locale}
        role="ADMIN"
        backHref="/admin/disputes"
        backLabel="Back to disputes queue"
      />
    </AdminDashboardLayout>
  );
}
