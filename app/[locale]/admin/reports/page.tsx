"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
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
  const t = useTranslations("AdminPages.reports");
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
        t("loadError"),
        error instanceof Error ? error.message : t("unknownError")
      );
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        toast.success(t("markedPaid"));
        await loadReport();
      } catch (error) {
        toast.error(
          t("markPaidFailed"),
          error instanceof Error ? error.message : t("unknownError")
        );
      } finally {
        setActingInvoiceId(null);
      }
    },
    [loadReport, t]
  );

  const waiveInvoice = useCallback(
    async (invoiceId: string) => {
      const reason = window.prompt(t("waivePrompt"), t("waiveDefault"));
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
        toast.success(t("waived"));
        await loadReport();
      } catch (error) {
        toast.error(
          t("waiveFailed"),
          error instanceof Error ? error.message : t("unknownError")
        );
      } finally {
        setActingInvoiceId(null);
      }
    },
    [loadReport, t]
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
        toast.success(t("reactivated"));
        await loadReport();
      } catch (error) {
        toast.error(
          t("reactivateFailed"),
          error instanceof Error ? error.message : t("unknownError")
        );
      } finally {
        setReactivatingVendorId(null);
      }
    },
    [loadReport, t]
  );

  useEffect(() => {
    if (!authLoading && user) {
      void loadReport();
    }
  }, [authLoading, user, loadReport]);

  const invoiceColumns = useMemo<ColumnDef<MembershipInvoiceItem>[]>(
    () => [
      {
        header: t("columns.vendor"),
        id: "vendor",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">
              {row.original.vendorStoreName ?? t("untitledStore")}
            </p>
            <p className="text-xs text-neutral-500">{row.original.vendorSubscriptionStatus}</p>
          </div>
        ),
      },
      {
        header: t("columns.period"),
        id: "period",
        cell: ({ row }) => (
          <>
            {new Date(row.original.periodStart).toLocaleDateString()} –{" "}
            {new Date(row.original.periodEnd).toLocaleDateString()}
          </>
        ),
      },
      {
        header: t("columns.amount"),
        id: "amount",
        cell: ({ row }) => formatMoney(row.original.amount, row.original.currency),
      },
      {
        header: t("columns.status"),
        accessorKey: "status",
      },
      {
        header: t("columns.due"),
        id: "due",
        cell: ({ row }) => formatDate(row.original.dueAt),
      },
      {
        header: t("columns.attempted"),
        id: "attempted",
        cell: ({ row }) => formatDate(row.original.attemptedAt),
      },
      {
        header: t("columns.paid"),
        id: "paid",
        cell: ({ row }) => formatDate(row.original.paidAt),
      },
      {
        header: t("columns.stripeRefs"),
        id: "stripeRefs",
        cell: ({ row }) => (
          <div className="text-xs text-neutral-600">
            <p>
              Inv:{" "}
              <span className="font-mono">{row.original.stripeInvoiceId ?? "—"}</span>
            </p>
            <p className="mt-1">
              Pay:{" "}
              <span className="font-mono">{row.original.stripePaymentId ?? "—"}</span>
            </p>
          </div>
        ),
      },
      {
        header: t("columns.failure"),
        id: "failure",
        cell: ({ row }) =>
          row.original.failureReason ? (
            <div className="text-xs text-neutral-600">
              <p>{row.original.failureReason}</p>
              {row.original.failureCode ? (
                <p className="mt-1 font-mono">{row.original.failureCode}</p>
              ) : null}
            </div>
          ) : (
            "—"
          ),
      },
      {
        header: t("columns.actions"),
        id: "actions",
        cell: ({ row }) => {
          const invoice = row.original;
          return (
            <div
              className="flex flex-wrap gap-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {invoice.status === "PENDING" ? (
                <>
                  <button
                    type="button"
                    onClick={() => void markInvoicePaid(invoice.id)}
                    disabled={actingInvoiceId === invoice.id}
                    className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {actingInvoiceId === invoice.id ? t("saving") : t("markPaid")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void waiveInvoice(invoice.id)}
                    disabled={actingInvoiceId === invoice.id}
                    className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-60"
                  >
                    {t("waiveMonth")}
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
                    ? t("reactivating")
                    : t("reactivateVendor")}
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [actingInvoiceId, reactivatingVendorId, markInvoicePaid, waiveInvoice, reactivateVendor, t]
  );

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
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              {t("subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[35vh] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : !report ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-600">
          {t("empty")}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {t("paidAmount")}
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {formatMoney(report.paidAmount, report.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {t("pendingAmount")}
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-700">
                {formatMoney(report.pendingAmount, report.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {t("totalInvoices")}
              </p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">
                {report.totalInvoices}
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
              {t("recentInvoices")}
            </h2>
            <div className="mt-4">
              <DataTable
                data={report.recentInvoices}
                columns={invoiceColumns}
                getRowId={(row) => row.id}
                emptyMessage={t("emptyInvoices")}
                initialPageSize={10}
                pageSizeOptions={[10, 20, 50]}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
