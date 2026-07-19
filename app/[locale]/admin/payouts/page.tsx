"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type AdminPayoutItem = {
  id: string;
  status: "ON_HOLD" | "READY" | "SENT" | "FAILED";
  amount: number;
  currency: string;
  holdUntil: string;
  holdLabel: string | null;
  releasedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  eligibleForRelease: boolean;
  vendor: {
    id: string;
    storeName: string | null;
    storeSlug: string | null;
    label: string;
  };
  order: {
    orderVendorId: string;
    orderId: string | null;
    orderNumber: string;
  };
};

type AdminPayoutDetail = AdminPayoutItem & {
  sendMethod: "BANK";
  lineItems: Array<{
    productName: string;
    productSku: string | null;
    variantName: string | null;
    quantity: number;
    unitPriceAmount: number;
    lineTotalAmount: number;
    currency: string;
  }>;
  vendorOrder: {
    status: string;
    deliveryMethod: string | null;
    deliveredAt: string | null;
    subtotalAmount: number;
    deliveryAmount: number;
    discountAmount: number;
    grandTotalAmount: number;
    currency: string;
  };
  commission: {
    rateBps: number;
    baseAmount: number;
    commissionAmount: number;
    currency: string;
  } | null;
  bankDetails: {
    method: string;
    accountName: string | null;
    accountNumberOrIban: string | null;
    bankName: string | null;
    stripeEmail: string | null;
  } | null;
};

type AdminPayoutQueuesResponse = {
  now: string;
  hold: AdminPayoutItem[];
  ready: AdminPayoutItem[];
  released: AdminPayoutItem[];
};

type PayoutTab = "waiting" | "ready" | "paid";

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

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function payoutStatusClass(status: AdminPayoutItem["status"]) {
  if (status === "SENT") return "bg-emerald-50 text-emerald-700";
  if (status === "READY") return "bg-blue-50 text-blue-700";
  if (status === "ON_HOLD") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

export default function AdminPayoutsPage() {
  const t = useTranslations("AdminPages.payouts");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");

  const [data, setData] = useState<AdminPayoutQueuesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PayoutTab>("waiting");
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AdminPayoutDetail | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdminPayoutItem | null>(null);

  const money = useCallback(
    (amount: number, currency: string) => formatMoney(amount, currency, locale),
    [locale]
  );
  const dateLabel = useCallback(
    (value: string | null) => formatDate(value, locale),
    [locale]
  );

  const payoutStatusLabel = useCallback(
    (status: AdminPayoutItem["status"]) =>
      t.has(`statuses.${status}`) ? t(`statuses.${status}`) : status.replace("_", " "),
    [t]
  );

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/api/admin/payouts");
      const payload = await parseApiResponse<AdminPayoutQueuesResponse>(response);
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadPayouts();
    }
  }, [authLoading, user, loadPayouts]);

  const openDetail = useCallback(
    async (payoutId: string) => {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);
      setError(null);
      try {
        const response = await fetchWithAuth(`/api/admin/payouts/${payoutId}`);
        const payload = await parseApiResponse<AdminPayoutDetail>(response);
        setDetail(payload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t("detailLoadError"));
        setDetailOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [t]
  );

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetail(null);
  }, []);

  const runAction = useCallback(
    async (payoutId: string, type: "release" | "sent", meta?: AdminPayoutItem | null) => {
      if (activeActionId) return;
      setActiveActionId(payoutId);
      setError(null);
      try {
        const endpoint =
          type === "release" ? "/api/admin/payouts/release" : "/api/admin/payouts/sent";
        const body =
          type === "release"
            ? { payoutId }
            : { payoutId, sentVia: "BANK" as const };
        const res = await fetchWithAuth(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await parseApiResponse(res);
        if (type === "release") {
          const shop = meta?.vendor.label ?? detail?.vendor.label ?? "—";
          const order = meta?.order.orderNumber ?? detail?.order.orderNumber ?? "—";
          toast.success(
            t("toasts.approveTitle"),
            t("toasts.approveBody", { shop, order })
          );
          setApproveTarget(null);
        } else {
          toast.success(t("toasts.sentTitle"), t("toasts.sentBody"));
        }
        await loadPayouts();
        if (detailOpen && detail?.id === payoutId) {
          await openDetail(payoutId);
        }
      } catch (actionError) {
        const message =
          actionError instanceof Error ? actionError.message : t("actionError");
        setError(message);
        toast.error(t("actionError"), message);
      } finally {
        setActiveActionId(null);
      }
    },
    [activeActionId, detail, detailOpen, loadPayouts, openDetail, t]
  );

  const confirmApprove = useCallback(() => {
    if (!approveTarget) return;
    void runAction(approveTarget.id, "release", approveTarget);
  }, [approveTarget, runAction]);

  const queueCounts = useMemo(() => {
    if (!data) return { waiting: 0, ready: 0, paid: 0 };
    return {
      waiting: data.hold.length,
      ready: data.ready.length,
      paid: data.released.length,
    };
  }, [data]);

  const activeRows = useMemo(() => {
    if (!data) return [];
    if (tab === "waiting") return data.hold;
    if (tab === "ready") return data.ready;
    return data.released;
  }, [data, tab]);

  const pagination = useClientPagination(activeRows, {
    initialPageSize: 10,
    resetKey: `${data?.now ?? ""}-${tab}`,
  });

  const tabs: Array<{ id: PayoutTab; label: string; count: number }> = [
    { id: "waiting", label: t("tabs.waiting"), count: queueCounts.waiting },
    { id: "ready", label: t("tabs.ready"), count: queueCounts.ready },
    { id: "paid", label: t("tabs.paid"), count: queueCounts.paid },
  ];

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadPayouts()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : !data ? null : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div
            role="tablist"
            aria-label={t("title")}
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
                  onClick={() => setTab(item.id)}
                  className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition sm:px-6 ${
                    active
                      ? "text-[#0f3460]"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      active
                        ? "bg-[#0f3460]/10 text-[#0f3460]"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {item.count}
                  </span>
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

          <div className="responsive-table-shell overflow-x-auto">
            {tab === "waiting" ? (
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <th className="px-4 py-2">{t("columns.vendor")}</th>
                    <th className="px-4 py-2">{t("columns.order")}</th>
                    <th className="px-4 py-2">{t("columns.amount")}</th>
                    <th className="px-4 py-2">{t("columns.created")}</th>
                    <th className="px-4 py-2">{t("columns.availableOn")}</th>
                    <th className="px-4 py-2">{t("columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-neutral-500" colSpan={6}>
                        {t("empty.waiting")}
                      </td>
                    </tr>
                  ) : (
                    pagination.paginatedItems.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{payout.vendor.label}</td>
                        <td className="px-4 py-3 text-neutral-700">
                          {payout.order.orderNumber}
                        </td>
                        <td className="px-4 py-3 text-neutral-900">
                          {money(payout.amount, payout.currency)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {dateLabel(payout.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {payout.holdLabel ?? dateLabel(payout.holdUntil)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void openDetail(payout.id)}
                            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                          >
                            {t("actions.viewDetails")}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : null}

            {tab === "ready" ? (
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <th className="px-4 py-2">{t("columns.vendor")}</th>
                    <th className="px-4 py-2">{t("columns.order")}</th>
                    <th className="px-4 py-2">{t("columns.amount")}</th>
                    <th className="px-4 py-2">{t("columns.status")}</th>
                    <th className="px-4 py-2">{t("columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-neutral-500" colSpan={5}>
                        {t("empty.ready")}
                      </td>
                    </tr>
                  ) : (
                    pagination.paginatedItems.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{payout.vendor.label}</td>
                        <td className="px-4 py-3 text-neutral-700">
                          {payout.order.orderNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          {money(payout.amount, payout.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {payout.holdLabel ?? t("readyBadge")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void openDetail(payout.id)}
                              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                            >
                              {t("actions.viewDetails")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setApproveTarget(payout)}
                              disabled={activeActionId === payout.id}
                              className="rounded-lg bg-[#0f3460] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
                            >
                              {t("actions.approvePay")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : null}

            {tab === "paid" ? (
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <th className="px-4 py-2">{t("columns.vendor")}</th>
                    <th className="px-4 py-2">{t("columns.order")}</th>
                    <th className="px-4 py-2">{t("columns.status")}</th>
                    <th className="px-4 py-2">{t("columns.amount")}</th>
                    <th className="px-4 py-2">{t("columns.approvedAt")}</th>
                    <th className="px-4 py-2">{t("columns.sentAt")}</th>
                    <th className="px-4 py-2">{t("columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-neutral-500" colSpan={7}>
                        {t("empty.paid")}
                      </td>
                    </tr>
                  ) : (
                    pagination.paginatedItems.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{payout.vendor.label}</td>
                        <td className="px-4 py-3 text-neutral-700">
                          {payout.order.orderNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${payoutStatusClass(
                              payout.status
                            )}`}
                          >
                            {payoutStatusLabel(payout.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-900">
                          {money(payout.amount, payout.currency)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {dateLabel(payout.releasedAt)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {dateLabel(payout.sentAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void openDetail(payout.id)}
                              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                            >
                              {t("actions.viewDetails")}
                            </button>
                            {payout.status === "READY" ? (
                              <button
                                type="button"
                                onClick={() => void runAction(payout.id, "sent")}
                                disabled={activeActionId === payout.id}
                                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                              >
                                {activeActionId === payout.id
                                  ? t("actions.marking")
                                  : t("actions.markSent")}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : null}
          </div>

          {activeRows.length > 0 ? (
            <PaginationFooter
              pageIndex={pagination.pageIndex}
              pageCount={pagination.pageCount}
              pageSize={pagination.pageSize}
              pageSizeOptions={pagination.pageSizeOptions}
              onPageIndexChange={pagination.setPageIndex}
              onPageSizeChange={pagination.setPageSize}
            />
          ) : null}
        </div>
      )}

      {approveTarget ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !activeActionId) {
              setApproveTarget(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="approve-pay-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <h2
              id="approve-pay-title"
              className="text-lg font-semibold text-neutral-900"
            >
              {t("confirmApprove.title")}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {t("confirmApprove.body", {
                shop: approveTarget.vendor.label,
                order: approveTarget.order.orderNumber,
                amount: money(approveTarget.amount, approveTarget.currency),
              })}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(activeActionId)}
                onClick={() => setApproveTarget(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {t("confirmApprove.cancel")}
              </button>
              <button
                type="button"
                disabled={Boolean(activeActionId)}
                onClick={confirmApprove}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
              >
                {activeActionId === approveTarget.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("actions.approving")}
                  </>
                ) : (
                  t("confirmApprove.confirm")
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4">
          <div className="flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-start justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">{t("detail.title")}</h2>
                <p className="mt-1 text-sm text-neutral-600">{t("detail.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                aria-label={t("detail.closeAria")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="flex min-h-[200px] items-center justify-center px-5 py-10">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      {t("columns.vendor")}
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">{detail.vendor.label}</dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      {t("columns.order")}
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {detail.order.orderNumber}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      {t("detail.itemsSubtotal")}
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {money(detail.vendorOrder.subtotalAmount, detail.vendorOrder.currency)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      {t("detail.netPayout")}
                    </dt>
                    <dd className="mt-1 text-lg font-bold text-[#0f3460]">
                      {money(detail.amount, detail.currency)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      {t("detail.status")}
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {payoutStatusLabel(detail.status)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      {t("detail.commission")}
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {detail.commission
                        ? money(
                            detail.commission.commissionAmount,
                            detail.commission.currency
                          )
                        : "—"}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      {t("detail.deliveryMethod")}
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {detail.vendorOrder.deliveryMethod ?? "—"}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">
                      {t("detail.availableOn")}
                    </dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {detail.holdLabel ?? dateLabel(detail.holdUntil)}
                    </dd>
                  </div>
                </dl>

                {detail.lineItems.length > 0 ? (
                  <section className="rounded-xl border border-neutral-200 bg-white">
                    <div className="border-b border-neutral-200 px-4 py-3">
                      <h3 className="text-sm font-semibold text-neutral-900">
                        {t("detail.lineItemsTitle")}
                      </h3>
                    </div>
                    <div className="responsive-table-shell overflow-x-auto">
                      <table className="w-full min-w-[520px] border-collapse text-sm">
                        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
                          <tr>
                            <th className="px-4 py-2">{t("columns.product")}</th>
                            <th className="px-4 py-2">{t("columns.qty")}</th>
                            <th className="px-4 py-2">{t("columns.lineTotal")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.lineItems.map((item, index) => (
                            <tr
                              key={`${item.productSku ?? item.productName}-${index}`}
                              className="border-t border-neutral-100"
                            >
                              <td className="px-4 py-2 text-neutral-900">
                                {item.productName}
                                {item.variantName ? (
                                  <span className="block text-xs text-neutral-500">
                                    {item.variantName}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-4 py-2 text-neutral-700">{item.quantity}</td>
                              <td className="px-4 py-2 font-medium text-neutral-900">
                                {money(item.lineTotalAmount, item.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}

                <section className="rounded-xl border border-[#0f3460]/20 bg-[#0f3460]/5 p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#0f3460]" />
                    <h3 className="text-sm font-semibold text-[#0f3460]">
                      {t("detail.bankTitle")}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-neutral-600">{t("detail.bankBody")}</p>

                  {detail.bankDetails?.accountName ||
                  detail.bankDetails?.accountNumberOrIban ||
                  detail.bankDetails?.bankName ? (
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-neutral-500">
                          {t("detail.accountName")}
                        </dt>
                        <dd className="mt-1 font-medium text-neutral-900">
                          {detail.bankDetails.accountName ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-neutral-500">
                          {t("detail.bankName")}
                        </dt>
                        <dd className="mt-1 font-medium text-neutral-900">
                          {detail.bankDetails.bankName ?? "—"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-neutral-500">
                          {t("detail.accountIban")}
                        </dt>
                        <dd className="mt-1 break-all font-mono text-sm font-medium text-neutral-900">
                          {detail.bankDetails.accountNumberOrIban ?? "—"}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {t("detail.noBank")}
                    </p>
                  )}
                </section>
              </div>
            )}

            {detail && !detailLoading ? (
              <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-neutral-200 px-5 py-3">
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {t("actions.close")}
                </button>
                {detail.status === "ON_HOLD" && detail.eligibleForRelease ? (
                  <button
                    type="button"
                    onClick={() => setApproveTarget(detail)}
                    disabled={activeActionId === detail.id}
                    className="rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
                  >
                    {t("actions.approvePay")}
                  </button>
                ) : null}
                {detail.status === "READY" ? (
                  <button
                    type="button"
                    onClick={() => void runAction(detail.id, "sent")}
                    disabled={activeActionId === detail.id}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {activeActionId === detail.id
                      ? t("actions.marking")
                      : t("actions.markSentBank")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
