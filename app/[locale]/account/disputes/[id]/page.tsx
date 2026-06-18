"use client";

import { RefundCaseDetailView } from "@/components/refunds/RefundCaseDetailView";
import { useCustomerRouteGuard } from "@/components/customer/use-customer-route-guard";
import { PageLoader } from "@/components/ui/PageLoader";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";

export default function CustomerDisputeDetailPage() {
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const { isLoading } = useCustomerRouteGuard();

  if (isLoading) return <PageLoader />;

  return (
    <RefundCaseDetailView
      refundCaseId={params.id}
      locale={locale}
      role="CUSTOMER"
      backHref="/account/disputes"
      backLabel="Back to disputes"
    />
  );
}
