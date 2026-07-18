"use client";

import { RefundCaseDetailView } from "@/components/refunds/RefundCaseDetailView";
import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PageLoader } from "@/components/ui/PageLoader";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function VendorDisputeDetailPage() {
  const t = useTranslations("VendorPages.disputes");
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
      backLabel={t("back")}
    />
  );
}
