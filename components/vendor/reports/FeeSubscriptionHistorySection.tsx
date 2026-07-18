"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarRange,
  CreditCard,
  Loader2,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type OrderFeeEntry = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  orderVendorId: string;
  baseAmount: number;
  rateBps: number;
  amount: number;
  currency: string;
  deductedAt: string;
};

type SubscriptionEntry = {
  id: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  dueAt: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "WAIVED" | "VOID";
  paidAt: string | null;
  attemptedAt: string | null;
  waivedReason: string | null;
  chargedAmount: number | null;
  stripeInvoiceId: string | null;
  stripePaymentId: string | null;
  failureReason: string | null;
};

type FeeSubscriptionReport = {
  from: string | null;
  to: string | null;
  rates: {
    transactionFeeAmountMinor: number;
    transactionFeeLabel: string;
    membershipFeeAmount: number;
    membershipCurrency: string;
    membershipTrialDays: number;
  };
  totals: {
    orderFeeCount: number;
    totalOrderFees: number;
    subscriptionInvoiceCount: number;
    totalSubscriptionCharged: number;
    totalFees: number;
  };
  orderFees: OrderFeeEntry[];
  subscriptionCharges: SubscriptionEntry[];
};

function formatCurrency(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDefaultRange() {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

const SUBSCRIPTION_STATUS_STYLES: Record<SubscriptionEntry["status"], string> = {
  PAID: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  WAIVED: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  VOID: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200",
};

export function FeeSubscriptionHistorySection() {
  const t = useTranslations("VendorPages.reports");
  const locale = useLocale();
  const [report, setReport] = useState<FeeSubscriptionReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDefaultRange();
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const response = await fetchWithAuth(
        `/api/vendor/reports/fee-subscription-history?${params}`
      );
      const data = await parseApiResponse<FeeSubscriptionReport>(response);
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

  const currency =
    report?.orderFees[0]?.currency ??
    report?.subscriptionCharges[0]?.currency ??
    report?.rates.membershipCurrency ??
    "USD";

  const commissionLabel = report?.rates.transactionFeeLabel ?? "—";
  const membershipLabel = report
    ? `${formatCurrency(
        report.rates.membershipFeeAmount,
        report.rates.membershipCurrency,
        locale
      )} / month`
    : "—";

  const orderFeesPagination = useClientPagination(report?.orderFees ?? [], {
    initialPageSize: 10,
    resetKey: report?.from ?? undefined,
  });
  const subscriptionPagination = useClientPagination(
    report?.subscriptionCharges ?? [],
    {
      initialPageSize: 10,
      resetKey: report?.from ?? undefined,
    }
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">{t("fees.intro")}</p>
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
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-medium text-neutral-500">
                {t("fees.cards.orderFees")}
              </p>
              <p className="mt-1 text-xl font-bold text-amber-700">
                {formatCurrency(report.totals.totalOrderFees, currency, locale)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {t("fees.cards.orderFeesSub", {
                  count: report.totals.orderFeeCount,
                  rate: commissionLabel,
                })}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-medium text-neutral-500">
                {t("fees.cards.membership")}
              </p>
              <p className="mt-1 text-xl font-bold text-primary">
                {formatCurrency(
                  report.totals.totalSubscriptionCharged,
                  currency,
                  locale
                )}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {t("fees.cards.membershipSub", {
                  count: report.totals.subscriptionInvoiceCount,
                  rate: membershipLabel,
                })}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-medium text-neutral-500">
                {t("fees.cards.total")}
              </p>
              <p className="mt-1 text-xl font-bold text-neutral-900">
                {formatCurrency(report.totals.totalFees, currency, locale)}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
                <CalendarRange className="h-3.5 w-3.5" />
                {t("common.last12Months")}
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 sm:px-5">
              <Receipt className="h-5 w-5 text-amber-600" />
              <h2 className="text-sm font-semibold text-neutral-900">
                {t("fees.orderFeesTitle")}
              </h2>
            </div>
            {report.orderFees.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-neutral-500">
                {t("fees.orderFeesEmpty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 sm:px-5">
                        {t("fees.columns.date")}
                      </th>
                      <th className="px-4 py-3 sm:px-5">
                        {t("fees.columns.order")}
                      </th>
                      <th className="px-4 py-3 text-right sm:px-5">
                        {t("fees.columns.subtotal")}
                      </th>
                      <th className="px-4 py-3 text-right sm:px-5">
                        {t("fees.columns.fee")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {orderFeesPagination.paginatedItems.map((entry) => (
                      <tr key={entry.id} className="hover:bg-neutral-50/80">
                        <td className="px-4 py-3 text-neutral-700 sm:px-5">
                          {formatDate(entry.deductedAt, locale)}
                        </td>
                        <td className="px-4 py-3 font-medium text-primary sm:px-5">
                          #{entry.orderNumber ?? entry.orderId.slice(-8)}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-600 sm:px-5">
                          {formatCurrency(
                            entry.baseAmount,
                            entry.currency,
                            locale
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-700 sm:px-5">
                          −
                          {formatCurrency(
                            entry.amount,
                            entry.currency,
                            locale
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {report.orderFees.length > 0 ? (
              <PaginationFooter
                pageIndex={orderFeesPagination.pageIndex}
                pageCount={orderFeesPagination.pageCount}
                pageSize={orderFeesPagination.pageSize}
                pageSizeOptions={orderFeesPagination.pageSizeOptions}
                onPageIndexChange={orderFeesPagination.setPageIndex}
                onPageSizeChange={orderFeesPagination.setPageSize}
              />
            ) : null}
          </section>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 sm:px-5">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-neutral-900">
                {t("fees.membershipTitle")}
              </h2>
            </div>
            {report.subscriptionCharges.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-neutral-500">
                {t("fees.membershipEmpty", {
                  days: report.rates.membershipTrialDays,
                })}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 sm:px-5">
                        {t("fees.columns.period")}
                      </th>
                      <th className="px-4 py-3 sm:px-5">
                        {t("fees.columns.due")}
                      </th>
                      <th className="px-4 py-3 sm:px-5">
                        {t("fees.columns.status")}
                      </th>
                      <th className="px-4 py-3 text-right sm:px-5">
                        {t("fees.columns.invoice")}
                      </th>
                      <th className="px-4 py-3 text-right sm:px-5">
                        {t("fees.columns.charged")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {subscriptionPagination.paginatedItems.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-neutral-50/80">
                        <td className="px-4 py-3 font-medium text-neutral-900 sm:px-5">
                          {invoice.periodLabel}
                        </td>
                        <td className="px-4 py-3 text-neutral-700 sm:px-5">
                          {formatDate(invoice.dueAt, locale)}
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${SUBSCRIPTION_STATUS_STYLES[invoice.status]}`}
                          >
                            {t(`fees.membershipStatus.${invoice.status}`)}
                          </span>
                          {invoice.waivedReason ? (
                            <p className="mt-1 max-w-xs text-xs text-neutral-500">
                              {invoice.waivedReason}
                            </p>
                          ) : null}
                          {invoice.failureReason ? (
                            <p className="mt-1 max-w-xs text-xs text-rose-600">
                              {t("fees.failure", {
                                reason: invoice.failureReason,
                              })}
                            </p>
                          ) : null}
                          {invoice.attemptedAt ? (
                            <p className="mt-1 max-w-xs text-xs text-neutral-500">
                              {t("fees.lastAttempt", {
                                date: formatDate(invoice.attemptedAt, locale),
                              })}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-600 sm:px-5">
                          {formatCurrency(
                            invoice.amount,
                            invoice.currency,
                            locale
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-neutral-900 sm:px-5">
                          {invoice.chargedAmount != null
                            ? invoice.chargedAmount > 0
                              ? `−${formatCurrency(
                                  invoice.chargedAmount,
                                  invoice.currency,
                                  locale
                                )}`
                              : "—"
                            : t("fees.chargedPending")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {report.subscriptionCharges.length > 0 ? (
              <PaginationFooter
                pageIndex={subscriptionPagination.pageIndex}
                pageCount={subscriptionPagination.pageCount}
                pageSize={subscriptionPagination.pageSize}
                pageSizeOptions={subscriptionPagination.pageSizeOptions}
                onPageIndexChange={subscriptionPagination.setPageIndex}
                onPageSizeChange={subscriptionPagination.setPageSize}
              />
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
