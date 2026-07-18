"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { FeeSubscriptionHistorySection } from "@/components/vendor/reports/FeeSubscriptionHistorySection";
import { PayoutHistorySection } from "@/components/vendor/reports/PayoutHistorySection";
import { SalesSummarySection } from "@/components/vendor/reports/SalesSummarySection";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

type ReportTab = "sales" | "fees" | "payouts";

const TABS: ReportTab[] = ["sales", "fees", "payouts"];

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
  const t = useTranslations("VendorPages.reports");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<ReportTab>("sales");

  useEffect(() => {
    const fromQuery = searchParams.get("tab");
    if (fromQuery && TAB_FROM_QUERY[fromQuery]) {
      setTab(TAB_FROM_QUERY[fromQuery]);
    }
  }, [searchParams]);

  const selectTab = useCallback(
    (next: ReportTab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            {t("subtitle")}
          </p>
          <Link
            href="/vendor/settings"
            className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t("settingsLink")}
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div
          role="tablist"
          aria-label={t("title")}
          className="flex gap-0 overflow-x-auto border-b border-neutral-200"
        >
          {TABS.map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(key)}
                className={`relative shrink-0 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition sm:px-6 ${
                  active
                    ? "text-primary"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                }`}
              >
                {t(`tabs.${key}`)}
                {active ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary sm:inset-x-4" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-5 sm:px-5">
          {tab === "sales" ? (
            <SalesSummarySection />
          ) : tab === "fees" ? (
            <FeeSubscriptionHistorySection />
          ) : (
            <PayoutHistorySection />
          )}
        </div>
      </div>
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
