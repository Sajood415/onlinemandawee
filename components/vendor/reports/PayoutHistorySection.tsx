"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarRange,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";

type PayoutStatus = "ON_HOLD" | "READY" | "SENT" | "FAILED";

type PayoutEntry = {
  id: string;
  orderVendorId: string;
  orderId: string | null;
  orderNumber: string | null;
  amount: number;
  currency: string;
  status: PayoutStatus;
  holdUntil: string;
  holdLabel: string | null;
  releasedAt: string | null;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

type PayoutHistoryReport = {
  currency: string;
  totals: {
    totalPayouts: number;
    totalAmount: number;
    sentCount: number;
    sentAmount: number;
  };
  byStatus: Record<PayoutStatus, number>;
  payouts: PayoutEntry[];
};

type StatusFilter = "all" | PayoutStatus;

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPayoutDateDisplay(entry: PayoutEntry) {
  if (entry.status === "SENT" && entry.sentAt) {
    return { primary: formatDate(entry.sentAt), secondary: "Sent" };
  }
  if (entry.status === "READY" && entry.releasedAt) {
    return { primary: formatDate(entry.releasedAt), secondary: "Released" };
  }
  if (entry.status === "ON_HOLD") {
    if (entry.holdLabel) {
      return { primary: entry.holdLabel, secondary: "On hold" };
    }
    return { primary: formatDate(entry.holdUntil), secondary: "Hold until" };
  }
  return { primary: formatDate(entry.createdAt), secondary: "Created" };
}

function getDefaultRange() {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

const STATUS_STYLES: Record<PayoutStatus, string> = {
  SENT: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  READY: "bg-blue-50 text-blue-700 border border-blue-200",
  ON_HOLD: "bg-amber-50 text-amber-700 border border-amber-200",
  FAILED: "bg-red-50 text-red-700 border border-red-200",
};

const STATUS_LABELS: Record<PayoutStatus, string> = {
  SENT: "Sent",
  READY: "Ready",
  ON_HOLD: "On hold",
  FAILED: "Failed",
};

export function PayoutHistorySection() {
  const [report, setReport] = useState<PayoutHistoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDefaultRange();
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const response = await fetchWithAuth(`/api/vendor/reports/payouts?${params}`);
      const data = await parseApiResponse<PayoutHistoryReport>(response);
      setReport(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load payout history."
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const currency = report?.currency ?? "USD";

  const filteredPayouts = useMemo(() => {
    if (!report) return [];
    if (statusFilter === "all") return report.payouts;
    return report.payouts.filter((payout) => payout.status === statusFilter);
  }, [report, statusFilter]);

  const payoutsPagination = useClientPagination(filteredPayouts, {
    initialPageSize: 10,
    resetKey: `${report?.totals.totalPayouts ?? 0}-${statusFilter}`,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          Payout amounts linked to each order, with dates when funds were sent to your account.
        </p>
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

      {report ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Sent to your account
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-700">
              {formatCurrency(report.totals.sentAmount, currency)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {report.totals.sentCount} payout{report.totals.sentCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              On hold
            </p>
            <p className="mt-1 text-xl font-bold text-amber-700">
              {report.byStatus.ON_HOLD}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Awaiting hold period</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Ready to send
            </p>
            <p className="mt-1 text-xl font-bold text-blue-700">{report.byStatus.READY}</p>
            <p className="mt-1 text-xs text-neutral-500">Released, pending transfer</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              All payouts (12 mo.)
            </p>
            <p className="mt-1 text-xl font-bold text-[#0f3460]">
              {formatCurrency(report.totals.totalAmount, currency)}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
              <CalendarRange className="h-3.5 w-3.5" />
              {report.totals.totalPayouts} records
            </p>
          </div>
        </div>
      ) : null}

      <div className="inline-flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "SENT" as const, label: "Sent" },
            { id: "ON_HOLD" as const, label: "On hold" },
            { id: "READY" as const, label: "Ready" },
            { id: "FAILED" as const, label: "Failed" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setStatusFilter(option.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === option.id
                ? "bg-primary text-white"
                : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-400" />
        </div>
      ) : !report ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-500">
          No payout history available.
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
            <Banknote className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-neutral-900">Payout history</h2>
          </div>

          {filteredPayouts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              No payouts match this filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {payoutsPagination.paginatedItems.map((entry) => {
                    const dateInfo = getPayoutDateDisplay(entry);
                    return (
                      <tr key={entry.id} className="hover:bg-neutral-50/80">
                        <td className="px-5 py-3">
                          <p className="font-medium text-neutral-900">
                            {entry.orderNumber ?? "—"}
                          </p>
                          {entry.orderId ? (
                            <p className="text-xs text-neutral-500">
                              Vendor order {entry.orderVendorId.slice(-8)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[entry.status]}`}
                          >
                            {STATUS_LABELS[entry.status]}
                          </span>
                          {entry.failureReason ? (
                            <p className="mt-1 max-w-xs text-xs text-red-600">
                              {entry.failureReason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-neutral-700">
                          <p>{dateInfo.primary}</p>
                          <p className="text-xs text-neutral-500">{dateInfo.secondary}</p>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                          {formatCurrency(entry.amount, entry.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredPayouts.length > 0 ? (
            <PaginationFooter
              pageIndex={payoutsPagination.pageIndex}
              pageCount={payoutsPagination.pageCount}
              pageSize={payoutsPagination.pageSize}
              pageSizeOptions={payoutsPagination.pageSizeOptions}
              onPageIndexChange={payoutsPagination.setPageIndex}
              onPageSizeChange={payoutsPagination.setPageSize}
            />
          ) : null}
        </section>
      )}
    </div>
  );
}
