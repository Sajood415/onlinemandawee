"use client";

import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { FeeSubscriptionHistorySection } from "@/components/vendor/reports/FeeSubscriptionHistorySection";
import { PayoutHistorySection } from "@/components/vendor/reports/PayoutHistorySection";
import { SalesSummarySection } from "@/components/vendor/reports/SalesSummarySection";

type ReportTab = "sales" | "fees" | "payouts";

const TAB_FROM_QUERY: Record<string, ReportTab> = {
  sales: "sales",
  fees: "fees",
  payouts: "payouts",
};

function ReportsLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
    </div>
  );
}

function VendorReportsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ReportTab>("sales");

  useEffect(() => {
    const fromQuery = searchParams.get("tab");
    if (fromQuery && TAB_FROM_QUERY[fromQuery]) {
      setTab(TAB_FROM_QUERY[fromQuery]);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f3460]">Reports</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sales, fees, membership charges, and payouts sent to your account.
        </p>
      </div>

      <div className="inline-flex flex-wrap rounded-lg border border-neutral-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("sales")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "sales"
              ? "bg-primary text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          Sales summary
        </button>
        <button
          type="button"
          onClick={() => setTab("fees")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "fees"
              ? "bg-primary text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          Fees &amp; subscription
        </button>
        <button
          type="button"
          onClick={() => setTab("payouts")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "payouts"
              ? "bg-primary text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          Payout history
        </button>
      </div>

      {tab === "sales" ? (
        <SalesSummarySection />
      ) : tab === "fees" ? (
        <FeeSubscriptionHistorySection />
      ) : (
        <PayoutHistorySection />
      )}
    </div>
  );
}

export default function VendorReportsPage() {
  const { isLoading: guardLoading } = useDashboardGuard("VENDOR");

  if (guardLoading) {
    return <ReportsLoading />;
  }

  return (
    <Suspense fallback={<ReportsLoading />}>
      <VendorReportsContent />
    </Suspense>
  );
}
