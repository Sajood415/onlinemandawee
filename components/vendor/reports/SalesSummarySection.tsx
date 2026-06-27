"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  Loader2,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type Granularity = "day" | "week" | "month";

type SalesSummaryPeriod = {
  periodKey: string;
  periodLabel: string;
  orderCount: number;
  itemsSold: number;
  subtotalAmount: number;
  deliveryAmount: number;
  grossSalesAmount: number;
  commissionAmount: number;
  netEarningsAmount: number;
};

type SalesSummaryReport = {
  vendorProfileId: string;
  currency: string;
  granularity: Granularity;
  from: string | null;
  to: string | null;
  totals: Omit<SalesSummaryPeriod, "periodKey" | "periodLabel">;
  periods: SalesSummaryPeriod[];
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getRangeForGranularity(granularity: Granularity) {
  const to = startOfUtcDay(new Date());
  to.setUTCHours(23, 59, 59, 999);

  const from = startOfUtcDay(new Date());

  if (granularity === "day") {
    from.setUTCDate(from.getUTCDate() - 29);
  } else if (granularity === "week") {
    from.setUTCDate(from.getUTCDate() - 7 * 11);
  } else {
    from.setUTCMonth(from.getUTCMonth() - 11);
    from.setUTCDate(1);
  }

  return { from, to };
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${accent}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-[#0f3460]">{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-neutral-500">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function SalesSummarySection() {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [report, setReport] = useState<SalesSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);

  const rangeLabel = useMemo(() => {
    if (granularity === "day") return "Last 30 days";
    if (granularity === "week") return "Last 12 weeks";
    return "Last 12 months";
  }, [granularity]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getRangeForGranularity(granularity);
      const params = new URLSearchParams({
        granularity,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const response = await fetchWithAuth(`/api/vendor/reports/sales-summary?${params}`);
      const data = await parseApiResponse<SalesSummaryReport>(response);
      setReport(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load sales report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [granularity]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const currency = report?.currency ?? "USD";
  const totals = report?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 shadow-sm">
          {(
            [
              { id: "day" as const, label: "Daily" },
              { id: "week" as const, label: "Weekly" },
              { id: "month" as const, label: "Monthly" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setGranularity(option.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                granularity === option.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm text-neutral-500">
          <CalendarRange className="h-4 w-4" />
          {rangeLabel}
        </span>
        <button
          type="button"
          onClick={() => void loadReport()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-400" />
        </div>
      ) : !report ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center text-sm text-neutral-600">
          No report data available.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={<ShoppingCart className="h-5 w-5" />}
              label="Orders"
              value={String(totals?.orderCount ?? 0)}
              sub={`${totals?.itemsSold ?? 0} items sold`}
              accent="bg-[#0f3460]"
            />
            <SummaryCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Gross sales (before fees)"
              value={formatCurrency(totals?.grossSalesAmount ?? 0, currency)}
              sub="Customer totals incl. delivery"
              accent="bg-primary"
            />
            <SummaryCard
              icon={<TrendingDown className="h-5 w-5" />}
              label="Platform fees"
              value={formatCurrency(totals?.commissionAmount ?? 0, currency)}
              sub="Commission on product subtotals"
              accent="bg-amber-500"
            />
            <SummaryCard
              icon={<Wallet className="h-5 w-5" />}
              label="Net earnings (after fees)"
              value={formatCurrency(totals?.netEarningsAmount ?? 0, currency)}
              sub="Your share after commission"
              accent="bg-emerald-600"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-neutral-900">Breakdown by period</h2>
            </div>

            {report.periods.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-neutral-500">
                No paid orders in this period yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-5 py-3">Period</th>
                      <th className="px-5 py-3 text-right">Orders</th>
                      <th className="px-5 py-3 text-right">Gross sales</th>
                      <th className="px-5 py-3 text-right">Fees</th>
                      <th className="px-5 py-3 text-right">Net earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {report.periods.map((period) => (
                      <tr key={period.periodKey} className="hover:bg-neutral-50/80">
                        <td className="px-5 py-3 font-medium text-neutral-900">
                          {period.periodLabel}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-700">
                          {period.orderCount}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-700">
                          {formatCurrency(period.grossSalesAmount, currency)}
                        </td>
                        <td className="px-5 py-3 text-right text-amber-700">
                          {formatCurrency(period.commissionAmount, currency)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                          {formatCurrency(period.netEarningsAmount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-neutral-200 bg-neutral-50 font-semibold text-neutral-900">
                    <tr>
                      <td className="px-5 py-3">Total</td>
                      <td className="px-5 py-3 text-right">{totals?.orderCount ?? 0}</td>
                      <td className="px-5 py-3 text-right">
                        {formatCurrency(totals?.grossSalesAmount ?? 0, currency)}
                      </td>
                      <td className="px-5 py-3 text-right text-amber-700">
                        {formatCurrency(totals?.commissionAmount ?? 0, currency)}
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-700">
                        {formatCurrency(totals?.netEarningsAmount ?? 0, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
