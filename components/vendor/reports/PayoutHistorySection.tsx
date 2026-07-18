"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarRange,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

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

function formatCurrency(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<PayoutStatus, string> = {
  SENT: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  READY: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  ON_HOLD: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  FAILED: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

const FILTERS: StatusFilter[] = [
  "all",
  "SENT",
  "ON_HOLD",
  "READY",
  "FAILED",
];

export function PayoutHistorySection() {
  const t = useTranslations("VendorPages.reports");
  const locale = useLocale();
  const [report, setReport] = useState<PayoutHistoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const to = new Date();
      to.setUTCHours(23, 59, 59, 999);
      const from = new Date();
      from.setUTCFullYear(from.getUTCFullYear() - 1);
      from.setUTCHours(0, 0, 0, 0);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const response = await fetchWithAuth(
        `/api/vendor/reports/payouts?${params}`
      );
      const data = await parseApiResponse<PayoutHistoryReport>(response);
      setReport(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("common.loadError")
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

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

  const getPayoutDateDisplay = (entry: PayoutEntry) => {
    if (entry.status === "SENT" && entry.sentAt) {
      return {
        primary: formatDate(entry.sentAt, locale),
        secondary: t("payouts.dateLabels.sent"),
      };
    }
    if (entry.status === "READY" && entry.releasedAt) {
      return {
        primary: formatDate(entry.releasedAt, locale),
        secondary: t("payouts.dateLabels.released"),
      };
    }
    if (entry.status === "ON_HOLD") {
      if (entry.holdLabel === "Until delivered") {
        return {
          primary: t("payouts.holdLabels.untilDelivered"),
          secondary: t("payouts.dateLabels.onHold"),
        };
      }
      if (entry.holdLabel === "Delivered — ready to release") {
        return {
          primary: t("payouts.holdLabels.deliveredReady"),
          secondary: t("payouts.dateLabels.onHold"),
        };
      }
      if (entry.holdLabel) {
        return {
          primary: entry.holdLabel,
          secondary: t("payouts.dateLabels.onHold"),
        };
      }
      return {
        primary: formatDate(entry.holdUntil, locale),
        secondary: t("payouts.dateLabels.holdUntil"),
      };
    }
    return {
      primary: formatDate(entry.createdAt, locale),
      secondary: t("payouts.dateLabels.created"),
    };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">{t("payouts.intro")}</p>
        <button
          type="button"
          onClick={() => void loadReport()}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : undefined}
          />
          {t("refresh")}
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[24vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-400" />
        </div>
      ) : !report ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-neutral-800">
            {t("common.empty")}
          </p>
          <button
            type="button"
            onClick={() => void loadReport()}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            {t("common.tryAgain")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-medium text-neutral-500">
                {t("payouts.cards.sent")}
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-700">
                {formatCurrency(report.totals.sentAmount, currency, locale)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {t("payouts.cards.sentSub", {
                  count: report.totals.sentCount,
                })}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-medium text-neutral-500">
                {t("payouts.cards.onHold")}
              </p>
              <p className="mt-1 text-xl font-bold text-amber-700">
                {report.byStatus.ON_HOLD}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {t("payouts.cards.onHoldSub")}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-medium text-neutral-500">
                {t("payouts.cards.ready")}
              </p>
              <p className="mt-1 text-xl font-bold text-sky-700">
                {report.byStatus.READY}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {t("payouts.cards.readySub")}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-medium text-neutral-500">
                {t("payouts.cards.all")}
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {formatCurrency(report.totals.totalAmount, currency, locale)}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
                <CalendarRange className="h-3.5 w-3.5" />
                {t("common.last12Months")}
              </p>
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
            {FILTERS.map((id) => {
              const active = statusFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-primary text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {id === "all"
                    ? t("payouts.filters.all")
                    : t(`payouts.filters.${id}`)}
                </button>
              );
            })}
          </div>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 sm:px-5">
              <Banknote className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-semibold text-neutral-900">
                {t("payouts.tableTitle")}
              </h2>
            </div>

            {filteredPayouts.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-neutral-500">
                {report.payouts.length === 0
                  ? t("payouts.empty")
                  : t("payouts.emptyFilter")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 sm:px-5">
                        {t("payouts.columns.order")}
                      </th>
                      <th className="px-4 py-3 sm:px-5">
                        {t("payouts.columns.status")}
                      </th>
                      <th className="px-4 py-3 sm:px-5">
                        {t("payouts.columns.date")}
                      </th>
                      <th className="px-4 py-3 text-right sm:px-5">
                        {t("payouts.columns.amount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {payoutsPagination.paginatedItems.map((entry) => {
                      const dateInfo = getPayoutDateDisplay(entry);
                      return (
                        <tr key={entry.id} className="hover:bg-neutral-50/80">
                          <td className="px-4 py-3 sm:px-5">
                            <p className="font-medium text-primary">
                              {entry.orderNumber
                                ? `#${entry.orderNumber}`
                                : "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3 sm:px-5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[entry.status]}`}
                            >
                              {t(`payouts.statuses.${entry.status}`)}
                            </span>
                            {entry.failureReason ? (
                              <p className="mt-1 max-w-xs text-xs text-red-600">
                                {entry.failureReason}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-neutral-700 sm:px-5">
                            <p>{dateInfo.primary}</p>
                            <p className="text-xs text-neutral-500">
                              {dateInfo.secondary}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700 sm:px-5">
                            {formatCurrency(
                              entry.amount,
                              entry.currency,
                              locale
                            )}
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
        </>
      )}
    </div>
  );
}
