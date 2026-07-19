"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, RefreshCw, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

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

type ConfirmAction =
  | { type: "markPaid"; invoiceId: string; shopName: string }
  | { type: "reactivate"; vendorProfileId: string; shopName: string }
  | null;

function formatMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

function statusBadgeClass(status: string) {
  if (status === "PAID" || status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING" || status === "TRIAL") return "bg-amber-50 text-amber-800";
  if (status === "WAIVED") return "bg-blue-50 text-blue-700";
  if (status === "SUSPENDED" || status === "FAILED" || status === "VOID")
    return "bg-rose-50 text-rose-700";
  return "bg-neutral-100 text-neutral-700";
}

function AdminReportsContent() {
  const t = useTranslations("AdminPages.reports");
  const locale = useLocale();
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
  const [waiveTarget, setWaiveTarget] = useState<MembershipInvoiceItem | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

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

  const money = useCallback(
    (amount: number, currency: string) => formatMoney(amount, currency, locale),
    [locale]
  );
  const dateLabel = useCallback(
    (iso: string | null) => formatDate(iso, locale),
    [locale]
  );

  const invoiceStatusLabel = useCallback(
    (status: MembershipInvoiceItem["status"]) =>
      t.has(`invoiceStatus.${status}`) ? t(`invoiceStatus.${status}`) : status,
    [t]
  );

  const subscriptionStatusLabel = useCallback(
    (status: MembershipInvoiceItem["vendorSubscriptionStatus"]) =>
      t.has(`subscriptionStatus.${status}`)
        ? t(`subscriptionStatus.${status}`)
        : status,
    [t]
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
          { method: "POST" }
        );
        await parseApiResponse(response);
        toast.success(t("markedPaid"));
        setConfirmAction(null);
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

  const submitWaive = useCallback(async () => {
    if (!waiveTarget) return;
    setActingInvoiceId(waiveTarget.id);
    try {
      const response = await fetchWithAuth(
        `/api/admin/membership/invoices/${waiveTarget.id}/waive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: waiveReason.trim() || t("waiveDefault"),
          }),
        }
      );
      await parseApiResponse(response);
      toast.success(t("waived"));
      setWaiveTarget(null);
      setWaiveReason("");
      await loadMembershipReport();
    } catch (error) {
      toast.error(
        t("waiveFailed"),
        error instanceof Error ? error.message : t("unknownError")
      );
    } finally {
      setActingInvoiceId(null);
    }
  }, [loadMembershipReport, t, waiveReason, waiveTarget]);

  const reactivateVendor = useCallback(
    async (vendorProfileId: string) => {
      setReactivatingVendorId(vendorProfileId);
      try {
        const response = await fetchWithAuth(
          `/api/admin/vendors/${vendorProfileId}/reactivate`,
          { method: "POST" }
        );
        await parseApiResponse(response);
        toast.success(t("reactivated"));
        setConfirmAction(null);
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
        header: t("columns.shop"),
        id: "shop",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">
              {row.original.vendorStoreName ?? t("untitledStore")}
            </p>
            <span
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
                row.original.vendorSubscriptionStatus
              )}`}
            >
              {subscriptionStatusLabel(row.original.vendorSubscriptionStatus)}
            </span>
          </div>
        ),
      },
      {
        header: t("columns.period"),
        id: "period",
        cell: ({ row }) => (
          <>
            {dateLabel(row.original.periodStart)} – {dateLabel(row.original.periodEnd)}
          </>
        ),
      },
      {
        header: t("columns.amount"),
        id: "amount",
        cell: ({ row }) => money(row.original.amount, row.original.currency),
      },
      {
        header: t("columns.status"),
        id: "status",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
              row.original.status
            )}`}
          >
            {invoiceStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        header: t("columns.due"),
        id: "due",
        cell: ({ row }) => dateLabel(row.original.dueAt),
      },
      {
        header: t("columns.paid"),
        id: "paid",
        cell: ({ row }) => dateLabel(row.original.paidAt),
      },
      {
        header: t("columns.failure"),
        id: "failure",
        cell: ({ row }) =>
          row.original.failureReason ? (
            <p className="max-w-56 text-xs text-neutral-600">
              {row.original.failureReason}
            </p>
          ) : (
            "—"
          ),
      },
      {
        header: t("columns.actions"),
        id: "actions",
        cell: ({ row }) => {
          const invoice = row.original;
          const shopName = invoice.vendorStoreName ?? t("untitledStore");
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
                    onClick={() =>
                      setConfirmAction({
                        type: "markPaid",
                        invoiceId: invoice.id,
                        shopName,
                      })
                    }
                    disabled={actingInvoiceId === invoice.id}
                    className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {actingInvoiceId === invoice.id ? t("saving") : t("markPaid")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWaiveTarget(invoice);
                      setWaiveReason(t("waiveDefault"));
                    }}
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
                  onClick={() =>
                    setConfirmAction({
                      type: "reactivate",
                      vendorProfileId: invoice.vendorProfileId,
                      shopName,
                    })
                  }
                  disabled={reactivatingVendorId === invoice.vendorProfileId}
                  className="rounded-md bg-[#0f3460] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {reactivatingVendorId === invoice.vendorProfileId
                    ? t("reactivating")
                    : t("reactivateShop")}
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [
      actingInvoiceId,
      dateLabel,
      invoiceStatusLabel,
      money,
      reactivatingVendorId,
      subscriptionStatusLabel,
      t,
    ]
  );

  const topLevelColumns = useMemo<ColumnDef<CategorySalesRow>[]>(
    () => [
      {
        header: t("salesByCategory.columns.category"),
        accessorKey: "name",
        cell: ({ row }) => (
          <p className="font-medium text-neutral-900">{row.original.name}</p>
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
          money(row.original.salesAmount, salesReport?.currency ?? "USD"),
      },
      {
        header: t("salesByCategory.columns.share"),
        id: "share",
        cell: ({ row }) => `${row.original.sharePercent.toFixed(1)}%`,
      },
    ],
    [money, salesReport?.currency, t]
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
          money(row.original.salesAmount, salesReport?.currency ?? "USD"),
      },
      {
        header: t("salesByCategory.columns.share"),
        id: "share",
        cell: ({ row }) => `${row.original.sharePercent.toFixed(1)}%`,
      },
    ],
    [money, salesReport?.currency, t]
  );

  const tabs: Array<{ id: ReportTab; label: string }> = [
    { id: "salesByCategory", label: t("tabs.salesByCategory") },
    { id: "membership", label: t("tabs.membership") },
  ];

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const confirmBusy =
    confirmAction?.type === "markPaid"
      ? actingInvoiceId === confirmAction.invoiceId
      : confirmAction?.type === "reactivate"
        ? reactivatingVendorId === confirmAction.vendorProfileId
        : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("pageTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("pageSubtitle")}</p>
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

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div
          role="tablist"
          aria-label={t("pageTitle")}
          className="flex gap-0 overflow-x-auto border-b border-neutral-200"
        >
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(item.id)}
                className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition sm:px-6 ${
                  active
                    ? "text-[#0f3460]"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#0f3460] sm:inset-x-4" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="border-b border-neutral-100 px-4 py-3">
          <p className="text-sm text-neutral-600">{t(`tabsHelp.${tab}`)}</p>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : tab === "salesByCategory" ? (
            !salesReport ? (
              <p className="py-10 text-center text-sm text-neutral-600">
                {t("salesByCategory.empty")}
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      {t("salesByCategory.totalSales")}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700">
                      {money(salesReport.totalSalesAmount, salesReport.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      {t("salesByCategory.paidOrders")}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-neutral-900">
                      {salesReport.paidOrdersCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-4">
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

                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">
                    {t("salesByCategory.topLevelTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    {t("salesByCategory.topLevelSubtitle")}
                  </p>
                  <div className="mt-3">
                    <DataTable
                      embedded
                      data={salesReport.topLevelCategories}
                      columns={topLevelColumns}
                      getRowId={(row) => row.categoryId}
                      emptyMessage={t("salesByCategory.emptyCategories")}
                      initialPageSize={10}
                      pageSizeOptions={[10, 20, 50]}
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">
                    {t("salesByCategory.detailTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    {t("salesByCategory.detailSubtitle")}
                  </p>
                  <div className="mt-3">
                    <DataTable
                      embedded
                      data={salesReport.categories}
                      columns={detailColumns}
                      getRowId={(row) => row.categoryId}
                      emptyMessage={t("salesByCategory.emptyCategories")}
                      initialPageSize={10}
                      pageSizeOptions={[10, 20, 50]}
                    />
                  </div>
                </div>
              </div>
            )
          ) : !membershipReport ? (
            <p className="py-10 text-center text-sm text-neutral-600">{t("empty")}</p>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t("paidAmount")}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">
                    {money(membershipReport.paidAmount, membershipReport.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t("pendingAmount")}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-amber-700">
                    {money(membershipReport.pendingAmount, membershipReport.currency)}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t("waivedCount")}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900">
                    {membershipReport.waivedCount}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t("totalInvoices")}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-neutral-900">
                    {membershipReport.totalInvoices}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  {t("recentInvoices")}
                </h2>
                <p className="mt-1 text-sm text-neutral-600">{t("recentInvoicesHelp")}</p>
                <div className="mt-3">
                  <DataTable
                    embedded
                    data={membershipReport.recentInvoices}
                    columns={invoiceColumns}
                    getRowId={(row) => row.id}
                    emptyMessage={t("emptyInvoices")}
                    initialPageSize={10}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {waiveTarget ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actingInvoiceId) {
              setWaiveTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="waive-fee-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="waive-fee-title" className="text-lg font-semibold text-neutral-900">
                  {t("waiveModal.title")}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  {t("waiveModal.body", {
                    shop: waiveTarget.vendorStoreName ?? t("untitledStore"),
                  })}
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(actingInvoiceId)}
                onClick={() => setWaiveTarget(null)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-60"
                aria-label={t("waiveModal.cancel")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("waiveModal.reasonLabel")}
              </label>
              <textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(actingInvoiceId)}
                onClick={() => setWaiveTarget(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {t("waiveModal.cancel")}
              </button>
              <button
                type="button"
                disabled={Boolean(actingInvoiceId)}
                onClick={() => void submitWaive()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
              >
                {actingInvoiceId === waiveTarget.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {actingInvoiceId === waiveTarget.id
                  ? t("saving")
                  : t("waiveModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !confirmBusy) {
              setConfirmAction(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reports-confirm-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <h2
              id="reports-confirm-title"
              className="text-lg font-semibold text-neutral-900"
            >
              {confirmAction.type === "markPaid"
                ? t("confirmMarkPaid.title")
                : t("confirmReactivate.title")}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {confirmAction.type === "markPaid"
                ? t("confirmMarkPaid.body", { shop: confirmAction.shopName })
                : t("confirmReactivate.body", { shop: confirmAction.shopName })}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {t("confirmCancel")}
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => {
                  if (confirmAction.type === "markPaid") {
                    void markInvoicePaid(confirmAction.invoiceId);
                  } else {
                    void reactivateVendor(confirmAction.vendorProfileId);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
              >
                {confirmBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmBusy
                  ? t("saving")
                  : confirmAction.type === "markPaid"
                    ? t("confirmMarkPaid.confirm")
                    : t("confirmReactivate.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
