"use client";

import { useTranslations } from "next-intl";
import { CreditCard, Receipt, TrendingDown, Wallet } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";

type FeeEarningsOrder = {
  id: string;
  orderNumber: string;
  vendorOrderStatus: string;
  paymentStatus: string;
  orderTotal: number;
  transactionFee: number | null;
  netEarnings: number | null;
  currency: string;
  isSettled: boolean;
  createdAt: string;
};

type FeeEarningsBoard = {
  currency: string;
  transactionFeeAmountMinor: number;
  transactionFeeLabel: string;
  subscription: {
    monthlyAmount: number;
    currency: string;
    status: string;
    periodLabel: string | null;
    dueAt: string | null;
    invoiceAmount: number;
  };
  orders: FeeEarningsOrder[];
  totals: {
    settledOrderCount: number;
    orderTotal: number;
    transactionFees: number;
    netEarnings: number;
  };
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FeeEarningsDashboard({ data }: { data: FeeEarningsBoard }) {
  const t = useTranslations("VendorPages.feeEarnings");
  const feeLabel = data.transactionFeeLabel;
  const ordersPagination = useClientPagination(data.orders, { initialPageSize: 10 });

  return (
    <section className="mt-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0f3460]">{t("title")}</h2>
          <p className="mt-1 text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <Link
          href="/vendor/reports"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("fullReports")}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                {t("transactionFee")}
              </p>
              <p className="mt-1 text-sm text-amber-900">{feeLabel}</p>
              <p className="mt-2 text-lg font-bold text-amber-900">
                {formatCurrency(data.totals.transactionFees, data.currency)}
              </p>
              <p className="text-xs text-amber-800">
                {t("deductedOn", { count: data.totals.settledOrderCount })}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {t("netEarnings")}
              </p>
              <p className="mt-2 text-lg font-bold text-emerald-900">
                {formatCurrency(data.totals.netEarnings, data.currency)}
              </p>
              <p className="text-xs text-emerald-800">{t("afterFees")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm lg:col-span-1">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t("monthlySubscription")}
              </p>
              <p className="mt-2 text-lg font-bold text-[#0f3460]">
                {formatCurrency(
                  data.subscription.monthlyAmount,
                  data.subscription.currency
                )}
                <span className="text-sm font-medium text-neutral-600"> {t("perMonth")}</span>
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {data.subscription.periodLabel
                  ? t("currentPeriod", { period: data.subscription.periodLabel })
                  : t("billedMonthly")}
              </p>
              <p className="mt-1 text-xs font-medium text-neutral-700">
                {t("status", { status: data.subscription.status.replace(/_/g, " ") })}
                {data.subscription.dueAt
                  ? t("due", { date: formatDate(data.subscription.dueAt) })
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-neutral-900">{t("breakdownTitle")}</h3>
        </div>

        {data.orders.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-neutral-500">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3">{t("columns.order")}</th>
                  <th className="px-5 py-3">{t("columns.date")}</th>
                  <th className="px-5 py-3 text-right">{t("columns.orderTotal")}</th>
                  <th className="px-5 py-3 text-right">{t("columns.transactionFee")}</th>
                  <th className="px-5 py-3 text-right">{t("columns.netEarnings")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {ordersPagination.paginatedItems.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/80">
                    <td className="px-5 py-3">
                      <p className="font-medium text-neutral-900">{order.orderNumber}</p>
                      <p className="text-xs text-neutral-500">
                        {order.vendorOrderStatus} · {order.paymentStatus}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-neutral-700">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-neutral-900">
                      {formatCurrency(order.orderTotal, order.currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-amber-700">
                      {order.transactionFee != null ? (
                        <>−{formatCurrency(order.transactionFee, order.currency)}</>
                      ) : (
                        <span className="text-neutral-400" title={t("pendingTitle")}>
                          {t("pending")}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                      {order.netEarnings != null ? (
                        formatCurrency(order.netEarnings, order.currency)
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {data.totals.settledOrderCount > 0 ? (
                <tfoot className="border-t border-neutral-200 bg-neutral-50 font-semibold text-neutral-900">
                  <tr>
                    <td className="px-5 py-3" colSpan={2}>
                      {t("settledTotals", { count: data.totals.settledOrderCount })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {formatCurrency(data.totals.orderTotal, data.currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-amber-700">
                      −{formatCurrency(data.totals.transactionFees, data.currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-700">
                      {formatCurrency(data.totals.netEarnings, data.currency)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
        {data.orders.length > 0 ? (
          <PaginationFooter
            pageIndex={ordersPagination.pageIndex}
            pageCount={ordersPagination.pageCount}
            pageSize={ordersPagination.pageSize}
            pageSizeOptions={ordersPagination.pageSizeOptions}
            onPageIndexChange={ordersPagination.setPageIndex}
            onPageSizeChange={ordersPagination.setPageSize}
          />
        ) : null}
      </div>
    </section>
  );
}
