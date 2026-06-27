"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type MembershipInvoiceItem = {
  id: string;
  vendorProfileId: string;
  vendorStoreName: string | null;
  vendorStoreSlug: string | null;
  vendorSubscriptionStatus: "TRIAL" | "ACTIVE" | "FAILED" | "SUSPENDED";
  status: "PENDING" | "PAID" | "WAIVED" | "VOID";
  amount: number;
  currency: string;
  stripeInvoiceId: string | null;
  stripePaymentId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  failureCode: string | null;
  failureReason: string | null;
  periodStart: string;
  periodEnd: string;
  dueAt: string;
  paidAt: string | null;
  attemptedAt: string | null;
  waivedReason: string | null;
};

type MembershipReport = {
  membershipFeeAmount: number;
  membershipTrialDays: number;
  currency: string;
  totalInvoices: number;
  pendingAmount: number;
  paidAmount: number;
  waivedCount: number;
  recentInvoices: MembershipInvoiceItem[];
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function AdminReportsPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [report, setReport] = useState<MembershipReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingInvoiceId, setActingInvoiceId] = useState<string | null>(null);
  const [reactivatingVendorId, setReactivatingVendorId] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date();
      from.setUTCFullYear(from.getUTCFullYear() - 1);
      from.setUTCHours(0, 0, 0, 0);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: now.toISOString(),
      });
      const response = await fetchWithAuth(`/api/admin/reports/membership?${params}`);
      const data = await parseApiResponse<MembershipReport>(response);
      setReport(data);
    } catch (error) {
      toast.error(
        "Failed to load membership report",
        error instanceof Error ? error.message : "Unknown error"
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const markInvoicePaid = useCallback(
    async (invoiceId: string) => {
      setActingInvoiceId(invoiceId);
      try {
        const response = await fetchWithAuth(
          `/api/admin/membership/invoices/${invoiceId}/mark-paid`,
          {
            method: "POST",
          }
        );
        await parseApiResponse(response);
        toast.success("Invoice marked as paid");
        await loadReport();
      } catch (error) {
        toast.error(
          "Could not mark invoice paid",
          error instanceof Error ? error.message : "Unknown error"
        );
      } finally {
        setActingInvoiceId(null);
      }
    },
    [loadReport]
  );

  const waiveInvoice = useCallback(
    async (invoiceId: string) => {
      const reason = window.prompt(
        "Reason for waiving this month?",
        "Waived by admin"
      );
      if (reason == null) {
        return;
      }

      setActingInvoiceId(invoiceId);
      try {
        const response = await fetchWithAuth(
          `/api/admin/membership/invoices/${invoiceId}/waive`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          }
        );
        await parseApiResponse(response);
        toast.success("Invoice waived");
        await loadReport();
      } catch (error) {
        toast.error(
          "Could not waive invoice",
          error instanceof Error ? error.message : "Unknown error"
        );
      } finally {
        setActingInvoiceId(null);
      }
    },
    [loadReport]
  );

  const reactivateVendor = useCallback(
    async (vendorProfileId: string) => {
      setReactivatingVendorId(vendorProfileId);
      try {
        const response = await fetchWithAuth(
          `/api/admin/vendors/${vendorProfileId}/reactivate`,
          {
            method: "POST",
          }
        );
        await parseApiResponse(response);
        toast.success("Vendor reactivated");
        await loadReport();
      } catch (error) {
        toast.error(
          "Could not reactivate vendor",
          error instanceof Error ? error.message : "Unknown error"
        );
      } finally {
        setReactivatingVendorId(null);
      }
    },
    [loadReport]
  );

  useEffect(() => {
    if (!authLoading && user) {
      void loadReport();
    }
  }, [authLoading, user, loadReport]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#0f3460]">
              Membership Billing Report
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Stripe subscription invoices, payment status, and failure reasons.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[35vh] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : !report ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-600">
          No membership report data available.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Paid amount
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {formatMoney(report.paidAmount, report.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Pending amount
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-700">
                {formatMoney(report.pendingAmount, report.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total invoices
              </p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">
                {report.totalInvoices}
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
              Recent Membership Invoices
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Due</th>
                    <th className="px-3 py-2">Attempted</th>
                    <th className="px-3 py-2">Paid</th>
                    <th className="px-3 py-2">Stripe refs</th>
                    <th className="px-3 py-2">Failure</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-neutral-100">
                      <td className="px-3 py-3">
                        <p className="font-medium text-neutral-900">
                          {invoice.vendorStoreName ?? "Untitled store"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {invoice.vendorSubscriptionStatus}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {new Date(invoice.periodStart).toLocaleDateString()} –{" "}
                        {new Date(invoice.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {formatMoney(invoice.amount, invoice.currency)}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">{invoice.status}</td>
                      <td className="px-3 py-3 text-neutral-700">{formatDate(invoice.dueAt)}</td>
                      <td className="px-3 py-3 text-neutral-700">
                        {formatDate(invoice.attemptedAt)}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">{formatDate(invoice.paidAt)}</td>
                      <td className="px-3 py-3 text-xs text-neutral-600">
                        <p>
                          Inv: <span className="font-mono">{invoice.stripeInvoiceId ?? "—"}</span>
                        </p>
                        <p className="mt-1">
                          Pay: <span className="font-mono">{invoice.stripePaymentId ?? "—"}</span>
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-neutral-600">
                        {invoice.failureReason ? (
                          <>
                            <p>{invoice.failureReason}</p>
                            {invoice.failureCode ? (
                              <p className="mt-1 font-mono">{invoice.failureCode}</p>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {invoice.status === "PENDING" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void markInvoicePaid(invoice.id)}
                                disabled={actingInvoiceId === invoice.id}
                                className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                {actingInvoiceId === invoice.id ? "Saving..." : "Mark paid"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void waiveInvoice(invoice.id)}
                                disabled={actingInvoiceId === invoice.id}
                                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-60"
                              >
                                Waive month
                              </button>
                            </>
                          ) : null}
                          {invoice.vendorSubscriptionStatus === "SUSPENDED" ? (
                            <button
                              type="button"
                              onClick={() => void reactivateVendor(invoice.vendorProfileId)}
                              disabled={reactivatingVendorId === invoice.vendorProfileId}
                              className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {reactivatingVendorId === invoice.vendorProfileId
                                ? "Reactivating..."
                                : "Reactivate vendor"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
