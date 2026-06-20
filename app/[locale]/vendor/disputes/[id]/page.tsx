"use client";

import { RefundCaseDetailView } from "@/components/refunds/RefundCaseDetailView";
import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PageLoader } from "@/components/ui/PageLoader";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";

export default function VendorDisputeDetailPage() {
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const { isLoading } = useDashboardGuard("VENDOR");

  if (isLoading) return <PageLoader />;

  return (
    <RefundCaseDetailView
      refundCaseId={params.id}
      locale={locale}
      role="VENDOR"
      backHref="/vendor/disputes"
      backLabel="Back to disputes"
    />
  );
}
