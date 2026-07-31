"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Loader2, RefreshCw, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { AdminSupplyRequestQuoteForm } from "@/components/admin/supply/AdminSupplyRequestQuoteForm";
import { DataTable } from "@/components/ui/data-table";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type SupplyRequestStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "AWAITING_PAYMENT"
  | "IN_PROGRESS"
  | "SHIPPED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

type SupplyRequestRow = {
  id: string;
  requestNumber: string;
  status: SupplyRequestStatus;
  productName: string;
  brand: string | null;
  modelSku: string | null;
  quantity: number;
  description: string;
  referenceUrls: string[] | null;
  imageUrls: string[] | null;
  categoryHint: string | null;
  budgetMinMinor: number | null;
  budgetMaxMinor: number | null;
  budgetCurrency: string | null;
  neededByDate: string | null;
  urgencyNote: string | null;
  allowAlternatives: boolean;
  deliveryMode: "SHIP" | "PICKUP";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  whatsapp: string | null;
  preferredContact: string | null;
  city: string;
  province: string | null;
  address: string;
  quoteAmountMinor: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteImageUrl: string | null;
  quoteSentAt: string | null;
  quoteExpiresAt: string | null;
  paidAt: string | null;
  paidAmountMinor: number | null;
  paymentMethod: string | null;
  offlinePaymentNote: string | null;
  rejectReason: string | null;
  trackingRef: string | null;
  carrierNote: string | null;
  shippedAt: string | null;
  refundedAt: string | null;
  refundAmountMinor: number | null;
  refundNote: string | null;
  adminNote: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
};

type StatusTab = "ALL" | SupplyRequestStatus;
type DetailTab = "details" | "actions";

const STATUS_TABS: StatusTab[] = [
  "ALL",
  "SUBMITTED",
  "REVIEWING",
  "AWAITING_PAYMENT",
  "IN_PROGRESS",
  "SHIPPED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
];

const SUPPLY_STATUSES = STATUS_TABS.filter(
  (status): status is SupplyRequestStatus => status !== "ALL"
);

const NEEDS_CONFIRM: SupplyRequestStatus[] = ["COMPLETED", "CANCELLED"];

const STATUS_BADGE: Record<SupplyRequestStatus, string> = {
  SUBMITTED: "bg-amber-50 text-amber-700",
  REVIEWING: "bg-sky-50 text-sky-700",
  AWAITING_PAYMENT: "bg-orange-50 text-orange-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-neutral-200 text-neutral-700",
  EXPIRED: "bg-neutral-100 text-neutral-500",
};

function formatDateLabel(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amountMinor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100);
}

function StatusBadge({ status }: { status: SupplyRequestStatus }) {
  const t = useTranslations("AdminPages.supplyRequests");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {t(`statuses.${status}`)}
    </span>
  );
}

export function AdminSupplyRequests() {
  const t = useTranslations("AdminPages.supplyRequests");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [requests, setRequests] = useState<SupplyRequestRow[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<SupplyRequestRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("details");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<SupplyRequestStatus | null>(null);

  const statusLabel = useCallback(
    (status: SupplyRequestStatus) => t(`statuses.${status}`),
    [t]
  );

  const loadRequests = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (statusTab !== "ALL") params.set("status", statusTab);
      const query = params.toString();
      const response = await fetchWithAuth(
        `/api/admin/supply-requests${query ? `?${query}` : ""}`
      );
      const data = await parseApiResponse<SupplyRequestRow[]>(response);
      setRequests(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadError"));
    } finally {
      setLoadingList(false);
    }
  }, [statusTab, t]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadRequests();
    }
  }, [authLoading, user, loadRequests]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((row) => {
      const haystack = [
        row.requestNumber,
        row.productName,
        row.customerName,
        row.customerEmail,
        row.city,
        row.brand ?? "",
        row.modelSku ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [requests, searchQuery]);

  const applyStatusChange = async (status: SupplyRequestStatus) => {
    if (!selected) return;
    setStatusUpdating(true);
    try {
      const response = await fetchWithAuth(`/api/admin/supply-requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const updated = await parseApiResponse<SupplyRequestRow>(response);
      setSelected(updated);
      setRequests((current) =>
        current.map((row) => (row.id === updated.id ? updated : row))
      );
      toast.success(t("statusUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("statusUpdateFailed"));
    } finally {
      setStatusUpdating(false);
      setPendingStatus(null);
    }
  };

  const handleStatusSelect = (status: SupplyRequestStatus) => {
    if (!selected || status === selected.status) return;
    if (NEEDS_CONFIRM.includes(status)) {
      setPendingStatus(status);
      return;
    }
    void applyStatusChange(status);
  };

  const openDetail = (row: SupplyRequestRow) => {
    setSelected(row);
    setDetailTab("details");
    setPendingStatus(null);
  };

  const closeDetail = () => {
    setSelected(null);
    setPendingStatus(null);
  };

  const columns = useMemo<ColumnDef<SupplyRequestRow>[]>(
    () => [
      {
        accessorKey: "requestNumber",
        header: t("columns.requestNumber"),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-[#0f3460]">
            {row.original.requestNumber}
          </span>
        ),
      },
      {
        accessorKey: "productName",
        header: t("columns.product"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.productName}</p>
            {row.original.brand ? (
              <p className="text-xs text-neutral-500">{row.original.brand}</p>
            ) : null}
            <p className="text-xs text-neutral-400">×{row.original.quantity}</p>
          </div>
        ),
      },
      {
        accessorKey: "customerName",
        header: t("columns.customer"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.customerName}</p>
            <p className="text-xs text-neutral-500">{row.original.customerEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("columns.status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: t("columns.date"),
        cell: ({ row }) => (
          <span className="text-sm text-neutral-600">
            {formatDateLabel(row.original.createdAt, locale)}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("columns.actions"),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openDetail(row.original)}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-[#0f3460]/30 hover:bg-[#0f3460]/5"
          >
            <Eye className="h-3.5 w-3.5" />
            {t("view")}
          </button>
        ),
      },
    ],
    [locale, t]
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadRequests()}
          disabled={loadingList}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-px">
        {STATUS_TABS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusTab(status)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
              statusTab === status
                ? "border-[#0f3460] text-[#0f3460]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {status === "ALL" ? t("tabs.all") : statusLabel(status)}
          </button>
        ))}
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
        />
      </div>

      {loadingList ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <DataTable
          data={filteredRequests}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage={t("empty")}
        />
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !statusUpdating) closeDetail();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-mono text-lg font-bold text-[#0f3460]">
                    {selected.requestNumber}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={selected.status} />
                    {!selected.allowAlternatives ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                        {t("noAlternatives")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-b border-neutral-200 pb-px">
                {(
                  [
                    { id: "details" as const, label: t("detailTabs.details") },
                    { id: "actions" as const, label: t("detailTabs.actions") },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
                      detailTab === tab.id
                        ? "border-[#0f3460] text-[#0f3460]"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              {detailTab === "details" ? (
                <>
                  {/* Product details */}
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                      {t("detail.product")}
                    </h3>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                      <p className="font-medium text-neutral-900">{selected.productName}</p>
                      {selected.brand ? (
                        <p>
                          {t("detail.brand")}: {selected.brand}
                        </p>
                      ) : null}
                      {selected.modelSku ? (
                        <p>
                          {t("detail.modelSku")}: {selected.modelSku}
                        </p>
                      ) : null}
                      <p>
                        {t("detail.quantity")}: {selected.quantity}
                      </p>
                      {selected.categoryHint ? (
                        <p>
                          {t("detail.category")}: {selected.categoryHint}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  {/* Description */}
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                      {t("detail.description")}
                    </h3>
                    <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                      {selected.description}
                    </p>
                  </section>

                  {/* Budget */}
                  <section className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        {t("detail.budget")}
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">
                        {selected.budgetMinMinor != null && selected.budgetCurrency
                          ? formatMoney(selected.budgetMinMinor, selected.budgetCurrency, locale)
                          : "—"}
                        {selected.budgetMaxMinor != null && selected.budgetCurrency
                          ? ` – ${formatMoney(selected.budgetMaxMinor, selected.budgetCurrency, locale)}`
                          : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        {t("detail.deliveryMode")}
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">
                        {t(`deliveryModes.${selected.deliveryMode}`)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        {t("detail.neededBy")}
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">
                        {selected.neededByDate ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        {t("detail.allowAlternatives")}
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">
                        {selected.allowAlternatives ? t("detail.yes") : t("detail.no")}
                      </p>
                    </div>
                    {selected.urgencyNote ? (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-neutral-500">
                          {t("detail.urgencyNote")}
                        </p>
                        <p className="mt-1 text-sm text-neutral-800">{selected.urgencyNote}</p>
                      </div>
                    ) : null}
                  </section>

                  {/* Reference URLs */}
                  {selected.referenceUrls && selected.referenceUrls.length > 0 ? (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                        {t("detail.referenceUrls")}
                      </h3>
                      <ul className="space-y-1">
                        {selected.referenceUrls.map((url) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-sm text-[#0f3460] hover:underline"
                            >
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {/* Image gallery */}
                  {selected.imageUrls && selected.imageUrls.length > 0 ? (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                        {t("detail.images")}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {selected.imageUrls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative block aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover transition hover:scale-105"
                            />
                          </a>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {/* Customer & contact */}
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                      {t("detail.customer")}
                    </h3>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                      <p className="font-medium text-neutral-900">{selected.customerName}</p>
                      <p>{selected.customerEmail}</p>
                      <p>{selected.customerPhone}</p>
                      {selected.whatsapp ? (
                        <p>
                          WhatsApp: {selected.whatsapp}
                        </p>
                      ) : null}
                      {selected.preferredContact ? (
                        <p>
                          {t("detail.preferredContact")}: {selected.preferredContact}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  {/* Address */}
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                      {t("detail.address")}
                    </h3>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                      <p>{selected.address || "—"}</p>
                      <p>
                        {selected.city}
                        {selected.province ? `, ${selected.province}` : ""}
                      </p>
                    </div>
                  </section>

                  {/* Quote expiry */}
                  {selected.quoteExpiresAt ? (
                    <section>
                      <p className="text-xs font-medium text-neutral-500">
                        {t("detail.quoteExpiry")}
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">
                        {formatDateLabel(selected.quoteExpiresAt, locale)}
                      </p>
                    </section>
                  ) : null}

                  {/* Update status */}
                  <section>
                    <label className="mb-2 block text-sm font-semibold text-neutral-800">
                      {t("detail.updateStatus")}
                    </label>
                    <select
                      value={selected.status}
                      disabled={statusUpdating}
                      onChange={(event) =>
                        handleStatusSelect(event.target.value as SupplyRequestStatus)
                      }
                      className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 disabled:opacity-60"
                    >
                      {SUPPLY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </section>

                  <p className="text-xs text-neutral-500">
                    {t("detail.submitted", {
                      date: formatDateLabel(selected.createdAt, locale),
                    })}
                    {selected.updatedAt !== selected.createdAt
                      ? ` · ${t("detail.updated", {
                          date: formatDateLabel(selected.updatedAt, locale),
                        })}`
                      : ""}
                  </p>
                </>
              ) : (
                <AdminSupplyRequestQuoteForm
                  request={selected}
                  onUpdated={(updated) => {
                    setSelected((current) =>
                      current ? ({ ...current, ...updated } as SupplyRequestRow) : current
                    );
                    setRequests((current) =>
                      current.map((row) =>
                        row.id === updated.id
                          ? ({ ...row, ...updated } as SupplyRequestRow)
                          : row
                      )
                    );
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {pendingStatus && selected ? (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !statusUpdating) setPendingStatus(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">
              {t("statusConfirm.title")}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {t("statusConfirm.body", { status: statusLabel(pendingStatus) })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => setPendingStatus(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => void applyStatusChange(pendingStatus)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
              >
                {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {statusUpdating ? t("statusConfirm.saving") : t("statusConfirm.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
