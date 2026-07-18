"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Loader2,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";
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

function formatCurrency(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
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
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${accent}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-neutral-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-primary">{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-neutral-500">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function SalesSummarySection() {
  const t = useTranslations("VendorPages.reports");
  const locale = useLocale();
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [report, setReport] = useState<SalesSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getRangeForGranularity(granularity);
      const params = new URLSearchParams({
        granularity,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const response = await fetchWithAuth(
        `/api/vendor/reports/sales-summary?${params}`
      );
      const data = await parseApiResponse<SalesSummaryReport>(response);
      setReport(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("common.loadError")
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [granularity, t]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const currency = report?.currency ?? "USD";
  const totals = report?.totals;
  const periodsPagination = useClientPagination(report?.periods ?? [], {
    initialPageSize: 10,
    resetKey: `${granularity}-${report?.from ?? ""}-${report?.to ?? ""}`,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "day" as const, hint: t("sales.rangeDay") },
              { id: "week" as const, hint: t("sales.rangeWeek") },
              { id: "month" as const, hint: t("sales.rangeMonth") },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              onClick={() => setGranularity(option.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                granularity === option.id
                  ? "bg-primary text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {t(`sales.granularity.${option.id}`)}
            </button>
          ))}
        </div>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={<ShoppingCart className="h-5 w-5" />}
              label={t("sales.cards.orders")}
              value={String(totals?.orderCount ?? 0)}
              sub={t("sales.cards.ordersSub", {
                count: totals?.itemsSold ?? 0,
              })}
              accent="bg-primary"
            />
            <SummaryCard
              icon={<TrendingUp className="h-5 w-5" />}
              label={t("sales.cards.gross")}
              value={formatCurrency(
                totals?.grossSalesAmount ?? 0,
                currency,
                locale
              )}
              sub={t("sales.cards.grossSub")}
              accent="bg-sky-600"
            />
            <SummaryCard
              icon={<TrendingDown className="h-5 w-5" />}
              label={t("sales.cards.fees")}
              value={formatCurrency(
                totals?.commissionAmount ?? 0,
                currency,
                locale
              )}
              sub={t("sales.cards.feesSub")}
              accent="bg-amber-500"
            />
            <SummaryCard
              icon={<Wallet className="h-5 w-5" />}
              label={t("sales.cards.net")}
              value={formatCurrency(
                totals?.netEarningsAmount ?? 0,
                currency,
                locale
              )}
              sub={t("sales.cards.netSub")}
              accent="bg-emerald-600"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 sm:px-5">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-neutral-900">
                {t("sales.tableTitle")}
              </h2>
            </div>

            {report.periods.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-neutral-500">
                {t("sales.emptyPeriods")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 sm:px-5">
                        {t("sales.columns.period")}
                      </th>
                      <th className="px-4 py-3 text-right sm:px-5">
                        {t("sales.columns.orders")}
                      </th>
                      <th className="px-4 py-3 text-right sm:px-5">
                        {t("sales.columns.gross")}
                      </th>
                      <th className="px-4 py-3 text-right sm:px-5">
                        {t("sales.columns.fees")}
                      </th>
                      <th className="px-4 py-3 text-right sm:px-5">
                        {t("sales.columns.net")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {periodsPagination.paginatedItems.map((period) => (
                      <tr
                        key={period.periodKey}
                        className="hover:bg-neutral-50/80"
                      >
                        <td className="px-4 py-3 font-medium text-neutral-900 sm:px-5">
                          {period.periodLabel}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-700 sm:px-5">
                          {period.orderCount}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-700 sm:px-5">
                          {formatCurrency(
                            period.grossSalesAmount,
                            currency,
                            locale
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-700 sm:px-5">
                          {formatCurrency(
                            period.commissionAmount,
                            currency,
                            locale
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700 sm:px-5">
                          {formatCurrency(
                            period.netEarningsAmount,
                            currency,
                            locale
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-neutral-200 bg-neutral-50 font-semibold text-neutral-900">
                    <tr>
                      <td className="px-4 py-3 sm:px-5">
                        {t("common.total")}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        {totals?.orderCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        {formatCurrency(
                          totals?.grossSalesAmount ?? 0,
                          currency,
                          locale
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-700 sm:px-5">
                        {formatCurrency(
                          totals?.commissionAmount ?? 0,
                          currency,
                          locale
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 sm:px-5">
                        {formatCurrency(
                          totals?.netEarningsAmount ?? 0,
                          currency,
                          locale
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {report.periods.length > 0 ? (
              <PaginationFooter
                pageIndex={periodsPagination.pageIndex}
                pageCount={periodsPagination.pageCount}
                pageSize={periodsPagination.pageSize}
                pageSizeOptions={periodsPagination.pageSizeOptions}
                onPageIndexChange={periodsPagination.setPageIndex}
                onPageSizeChange={periodsPagination.setPageSize}
              />
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
