"use client";

import { RefundCaseDetailView } from "@/components/refunds/RefundCaseDetailView";
import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PageLoader } from "@/components/ui/PageLoader";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function AdminDisputeDetailPage() {
  const locale = useLocale();
  const t = useTranslations("AdminPages.disputes");
  const params = useParams<{ id: string }>();
  const { isLoading } = useDashboardGuard("ADMIN");

  if (isLoading) return <PageLoader />;

  return (
    <RefundCaseDetailView
      refundCaseId={params.id}
      locale={locale}
      role="ADMIN"
      backHref="/admin/disputes"
      backLabel={t("backToQueue")}
    />
  );
}
