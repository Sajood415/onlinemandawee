"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type ReportTab = "membership" | "salesByCategory";

const TAB_FROM_QUERY: Record<string, ReportTab> = {
  membership: "membership",
  salesByCategory: "salesByCategory",
  sales: "salesByCategory",
};

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

type CategorySalesRow = {
  categoryId: string;
  name: string;
  slug: string | null;
  parentId?: string | null;
  parentName?: string | null;
  salesAmount: number;
  unitsSold: number;
  lineCount: number;
  orderCount: number;
  sharePercent: number;
};

type SalesByCategoryReport = {
  currency: string;
  mixedCurrencies: boolean;
  periodFrom: string | null;
  periodTo: string | null;
  totalSalesAmount: number;
  totalUnitsSold: number;
  totalLineCount: number;
  paidOrdersCount: number;
  topLevelCategories: CategorySalesRow[];
  categories: CategorySalesRow[];
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

function buildDefaultRange() {
  const now = new Date();
  const from = new Date();
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  from.setUTCHours(0, 0, 0, 0);
  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

function AdminReportsContent() {
  const t = useTranslations("AdminPages.reports");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [tab, setTab] = useState<ReportTab>("salesByCategory");
  const [membershipReport, setMembershipReport] = useState<MembershipReport | null>(null);
  const [salesReport, setSalesReport] = useState<SalesByCategoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingInvoiceId, setActingInvoiceId] = useState<string | null>(null);
  const [reactivatingVendorId, setReactivatingVendorId] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = searchParams.get("tab");
    if (fromQuery && TAB_FROM_QUERY[fromQuery]) {
      setTab(TAB_FROM_QUERY[fromQuery]);
      return;
    }
    setTab("salesByCategory");
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

  const loadMembershipReport = useCallback(async () => {
    setLoading(true);
    try {
      const range = buildDefaultRange();
      const params = new URLSearchParams(range);
      const response = await fetchWithAuth(`/api/admin/reports/membership?${params}`);
      const data = await parseApiResponse<MembershipReport>(response);
      setMembershipReport(data);
    } catch (error) {
      toast.error(
        t("loadError"),
        error instanceof Error ? error.message : t("unknownError")
      );
      setMembershipReport(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadSalesByCategoryReport = useCallback(async () => {
    setLoading(true);
    try {
      const range = buildDefaultRange();
      const params = new URLSearchParams(range);
      const response = await fetchWithAuth(
        `/api/admin/reports/sales-by-category?${params}`
      );
      const data = await parseApiResponse<SalesByCategoryReport>(response);
      setSalesReport(data);
    } catch (error) {
      toast.error(
        t("salesByCategory.loadError"),
        error instanceof Error ? error.message : t("unknownError")
      );
      setSalesReport(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadActiveTab = useCallback(async () => {
    if (tab === "membership") {
      await loadMembershipReport();
      return;
    }
    await loadSalesByCategoryReport();
  }, [tab, loadMembershipReport, loadSalesByCategoryReport]);

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
        await loadMembershipReport();
      } catch (error) {
        toast.error(
          t("markPaidFailed"),
          error instanceof Error ? error.message : t("unknownError")
        );
      } finally {
        setActingInvoiceId(null);
      }
    },
    [loadMembershipReport, t]
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
        await loadMembershipReport();
      } catch (error) {
        toast.error(
          t("waiveFailed"),
          error instanceof Error ? error.message : t("unknownError")
        );
      } finally {
        setActingInvoiceId(null);
      }
    },
    [loadMembershipReport, t]
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
        await loadMembershipReport();
      } catch (error) {
        toast.error(
          t("reactivateFailed"),
          error instanceof Error ? error.message : t("unknownError")
        );
      } finally {
        setReactivatingVendorId(null);
      }
    },
    [loadMembershipReport, t]
  );

  useEffect(() => {
    if (!authLoading && user) {
      void loadActiveTab();
    }
  }, [authLoading, user, loadActiveTab]);

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

  const topLevelColumns = useMemo<ColumnDef<CategorySalesRow>[]>(
    () => [
      {
        header: t("salesByCategory.columns.category"),
        accessorKey: "name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.name}</p>
            {row.original.slug ? (
              <p className="text-xs text-neutral-500">{row.original.slug}</p>
            ) : null}
          </div>
        ),
      },
      {
        header: t("salesByCategory.columns.orders"),
        accessorKey: "orderCount",
      },
      {
        header: t("salesByCategory.columns.units"),
        accessorKey: "unitsSold",
      },
      {
        header: t("salesByCategory.columns.sales"),
        id: "sales",
        cell: ({ row }) =>
          formatMoney(row.original.salesAmount, salesReport?.currency ?? "USD"),
      },
      {
        header: t("salesByCategory.columns.share"),
        id: "share",
        cell: ({ row }) => `${row.original.sharePercent.toFixed(1)}%`,
      },
    ],
    [salesReport?.currency, t]
  );

  const detailColumns = useMemo<ColumnDef<CategorySalesRow>[]>(
    () => [
      {
        header: t("salesByCategory.columns.category"),
        accessorKey: "name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.name}</p>
            {row.original.parentName ? (
              <p className="text-xs text-neutral-500">
                {t("salesByCategory.parentOf", { parent: row.original.parentName })}
              </p>
            ) : (
              <p className="text-xs text-neutral-500">{t("salesByCategory.topLevel")}</p>
            )}
          </div>
        ),
      },
      {
        header: t("salesByCategory.columns.orders"),
        accessorKey: "orderCount",
      },
      {
        header: t("salesByCategory.columns.units"),
        accessorKey: "unitsSold",
      },
      {
        header: t("salesByCategory.columns.sales"),
        id: "sales",
        cell: ({ row }) =>
          formatMoney(row.original.salesAmount, salesReport?.currency ?? "USD"),
      },
      {
        header: t("salesByCategory.columns.share"),
        id: "share",
        cell: ({ row }) => `${row.original.sharePercent.toFixed(1)}%`,
      },
    ],
    [salesReport?.currency, t]
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
              {t("pageTitle")}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              {t("pageSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadActiveTab()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectTab("salesByCategory")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === "salesByCategory"
                ? "bg-[#0f3460] text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {t("tabs.salesByCategory")}
          </button>
          <button
            type="button"
            onClick={() => selectTab("membership")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === "membership"
                ? "bg-[#0f3460] text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {t("tabs.membership")}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[35vh] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : tab === "salesByCategory" ? (
        !salesReport ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-600">
            {t("salesByCategory.empty")}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {t("salesByCategory.totalSales")}
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {formatMoney(salesReport.totalSalesAmount, salesReport.currency)}
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {t("salesByCategory.paidOrders")}
                </p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {salesReport.paidOrdersCount}
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {t("salesByCategory.unitsSold")}
                </p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {salesReport.totalUnitsSold}
                </p>
              </div>
            </div>

            {salesReport.mixedCurrencies ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t("salesByCategory.mixedCurrencyNote")}
              </p>
            ) : null}

            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                {t("salesByCategory.topLevelTitle")}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                {t("salesByCategory.topLevelSubtitle")}
              </p>
              <div className="mt-4">
                <DataTable
                  data={salesReport.topLevelCategories}
                  columns={topLevelColumns}
                  getRowId={(row) => row.categoryId}
                  emptyMessage={t("salesByCategory.emptyCategories")}
                  initialPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                {t("salesByCategory.detailTitle")}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                {t("salesByCategory.detailSubtitle")}
              </p>
              <div className="mt-4">
                <DataTable
                  data={salesReport.categories}
                  columns={detailColumns}
                  getRowId={(row) => row.categoryId}
                  emptyMessage={t("salesByCategory.emptyCategories")}
                  initialPageSize={10}
                  pageSizeOptions={[10, 20, 50]}
                />
              </div>
            </section>
          </>
        )
      ) : !membershipReport ? (
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
                {formatMoney(membershipReport.paidAmount, membershipReport.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {t("pendingAmount")}
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-700">
                {formatMoney(membershipReport.pendingAmount, membershipReport.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {t("totalInvoices")}
              </p>
              <p className="mt-2 text-2xl font-bold text-neutral-900">
                {membershipReport.totalInvoices}
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
              {t("recentInvoices")}
            </h2>
            <div className="mt-4">
              <DataTable
                data={membershipReport.recentInvoices}
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

export default function AdminReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[45vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <AdminReportsContent />
    </Suspense>
  );
}
