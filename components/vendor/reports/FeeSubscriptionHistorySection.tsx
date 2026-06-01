"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarRange,
  CreditCard,
  Loader2,
  Receipt,
  RefreshCw,
} from "lucide-react";

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
  waivedReason: string | null;
  chargedAmount: number | null;
};

type FeeSubscriptionReport = {
  from: string | null;
  to: string | null;
  rates: {
    commissionRateBps: number;
    commissionRatePercent: number;
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

function getDefaultRange() {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  from.setUTCHours(0, 0, 0, 0);
  return { from, to };
}

const SUBSCRIPTION_STATUS_STYLES: Record<SubscriptionEntry["status"], string> = {
  PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  WAIVED: "bg-blue-50 text-blue-700 border border-blue-200",
  VOID: "bg-neutral-100 text-neutral-600 border border-neutral-200",
};

export function FeeSubscriptionHistorySection() {
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
        error instanceof Error ? error.message : "Could not load fee history."
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const currency =
    report?.orderFees[0]?.currency ??
    report?.subscriptionCharges[0]?.currency ??
    report?.rates.membershipCurrency ??
    "USD";

  const commissionLabel = report
    ? `${report.rates.commissionRatePercent.toFixed(2)}% per order`
    : "3.99% per order";

  const membershipLabel = report
    ? `${formatCurrency(report.rates.membershipFeeAmount, report.rates.membershipCurrency)} / month`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          Transaction fees deducted when orders are paid, and monthly membership invoices.
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
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Order transaction fees
            </p>
            <p className="mt-1 text-xl font-bold text-amber-700">
              {formatCurrency(report.totals.totalOrderFees, currency)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {report.totals.orderFeeCount} deductions · {commissionLabel}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Membership charged
            </p>
            <p className="mt-1 text-xl font-bold text-[#0f3460]">
              {formatCurrency(report.totals.totalSubscriptionCharged, currency)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {report.totals.subscriptionInvoiceCount} invoices · {membershipLabel}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Total fees (last 12 months)
            </p>
            <p className="mt-1 text-xl font-bold text-neutral-900">
              {formatCurrency(report.totals.totalFees, currency)}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
              <CalendarRange className="h-3.5 w-3.5" />
              Last 12 months
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-neutral-400" />
        </div>
      ) : !report ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-500">
          No fee history available.
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
              <Receipt className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-semibold text-neutral-900">
                Order transaction fees
              </h2>
            </div>
            {report.orderFees.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-neutral-500">
                No transaction fees recorded yet. Fees apply when customer payment is
                confirmed.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3 text-right">Order subtotal</th>
                      <th className="px-5 py-3 text-right">Rate</th>
                      <th className="px-5 py-3 text-right">Fee deducted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {report.orderFees.map((entry) => (
                      <tr key={entry.id} className="hover:bg-neutral-50/80">
                        <td className="px-5 py-3 text-neutral-700">
                          {formatDate(entry.deductedAt)}
                        </td>
                        <td className="px-5 py-3 font-medium text-neutral-900">
                          {entry.orderNumber ?? entry.orderId.slice(-8)}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-600">
                          {formatCurrency(entry.baseAmount, entry.currency)}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-600">
                          {(entry.rateBps / 100).toFixed(2)}%
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-amber-700">
                          −{formatCurrency(entry.amount, entry.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-neutral-900">
                Monthly membership
              </h2>
            </div>
            {report.subscriptionCharges.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-neutral-500">
                No membership invoices yet. New vendors receive{" "}
                {report.rates.membershipTrialDays} days free before billing starts.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-5 py-3">Billing period</th>
                      <th className="px-5 py-3">Due date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Invoice amount</th>
                      <th className="px-5 py-3 text-right">Charged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {report.subscriptionCharges.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-neutral-50/80">
                        <td className="px-5 py-3 font-medium text-neutral-900">
                          {invoice.periodLabel}
                        </td>
                        <td className="px-5 py-3 text-neutral-700">
                          {formatDate(invoice.dueAt)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${SUBSCRIPTION_STATUS_STYLES[invoice.status]}`}
                          >
                            {invoice.status}
                          </span>
                          {invoice.waivedReason ? (
                            <p className="mt-1 max-w-xs text-xs text-neutral-500">
                              {invoice.waivedReason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-600">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-neutral-900">
                          {invoice.chargedAmount != null
                            ? invoice.chargedAmount > 0
                              ? `−${formatCurrency(invoice.chargedAmount, invoice.currency)}`
                              : "—"
                            : "Pending"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
