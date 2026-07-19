"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Loader2, RefreshCw, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { AdminGiftRequestQuoteForm } from "@/components/admin/gifts/AdminGiftRequestQuoteForm";
import { GiftRequestMediaGallery } from "@/components/gifts/GiftRequestMediaGallery";
import { DataTable } from "@/components/ui/data-table";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type GiftRequestStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "AWAITING_PAYMENT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type GiftRequestRow = {
  id: string;
  requestNumber: string;
  status: GiftRequestStatus;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  recipientProvince: string | null;
  recipientAddress: string;
  occasion: string | null;
  preferredDeliveryDate: string | null;
  itemType: string | null;
  dressColor: string | null;
  dressSize: string | null;
  dressSleeveType: string | null;
  dressLength: string | null;
  dressFitting: string | null;
  dressTexture: string | null;
  dressForMale: boolean;
  dressForFemale: boolean;
  preparationNotes: string;
  deliveryInstructions: string;
  budgetNote: string | null;
  imageUrls: string[];
  videoUrls: string[];
  quoteAmountMinor: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteImageUrl: string | null;
  quoteSentAt: string | null;
  paidAt: string | null;
  paidAmountMinor: number | null;
  paymentMethod: string | null;
  offlinePaymentNote: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
};

type StatusTab = "ALL" | GiftRequestStatus;
type DetailTab = "details" | "quote";

const STATUS_TABS: StatusTab[] = [
  "ALL",
  "SUBMITTED",
  "REVIEWING",
  "AWAITING_PAYMENT",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const GIFT_STATUSES = STATUS_TABS.filter(
  (status): status is GiftRequestStatus => status !== "ALL"
);

const NEEDS_CONFIRM: GiftRequestStatus[] = ["COMPLETED", "CANCELLED"];

const STATUS_BADGE: Record<GiftRequestStatus, string> = {
  SUBMITTED: "bg-amber-50 text-amber-700",
  REVIEWING: "bg-sky-50 text-sky-700",
  AWAITING_PAYMENT: "bg-orange-50 text-orange-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-neutral-200 text-neutral-700",
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

function StatusBadge({ status }: { status: GiftRequestStatus }) {
  const t = useTranslations("AdminPages.giftRequests");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {t(`statuses.${status}`)}
    </span>
  );
}

export function AdminGiftRequests() {
  const t = useTranslations("AdminPages.giftRequests");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [requests, setRequests] = useState<GiftRequestRow[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<GiftRequestRow | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("details");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<GiftRequestStatus | null>(null);

  const statusLabel = useCallback(
    (status: GiftRequestStatus) => t(`statuses.${status}`),
    [t]
  );

  const loadRequests = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (statusTab !== "ALL") params.set("status", statusTab);
      const query = params.toString();
      const response = await fetchWithAuth(`/api/admin/gift-requests${query ? `?${query}` : ""}`);
      const data = await parseApiResponse<GiftRequestRow[]>(response);
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
        row.senderName,
        row.senderEmail,
        row.recipientName,
        row.recipientCity,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [requests, searchQuery]);

  const applyStatusChange = async (status: GiftRequestStatus) => {
    if (!selected) return;
    setStatusUpdating(true);
    try {
      const response = await fetchWithAuth(`/api/admin/gift-requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const updated = await parseApiResponse<GiftRequestRow>(response);
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

  const handleStatusSelect = (status: GiftRequestStatus) => {
    if (!selected || status === selected.status) return;
    if (NEEDS_CONFIRM.includes(status)) {
      setPendingStatus(status);
      return;
    }
    void applyStatusChange(status);
  };

  const openDetail = (row: GiftRequestRow) => {
    setSelected(row);
    setDetailTab("details");
    setPendingStatus(null);
  };

  const closeDetail = () => {
    setSelected(null);
    setPendingStatus(null);
  };

  const dressForLabel = (row: GiftRequestRow) => {
    const parts = [
      row.dressForMale ? t("detail.male") : null,
      row.dressForFemale ? t("detail.female") : null,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  };

  const columns = useMemo<ColumnDef<GiftRequestRow>[]>(
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
        accessorKey: "senderName",
        header: t("columns.sender"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.senderName}</p>
            <p className="text-xs text-neutral-500">{row.original.senderEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "recipientName",
        header: t("columns.recipient"),
        cell: ({ row }) => (
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-neutral-900">{row.original.recipientName}</p>
              {row.original.itemType === "DRESS" ? (
                <span className="rounded-full bg-[#0f3460]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0f3460]">
                  {t("dress")}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-neutral-500">{row.original.recipientCity}</p>
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
                  <div className="mt-2">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-b border-neutral-200 pb-px">
                {(
                  [
                    { id: "details" as const, label: t("detailTabs.details") },
                    { id: "quote" as const, label: t("detailTabs.quote") },
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
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                      {t("detail.sender")}
                    </h3>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                      <p className="font-medium text-neutral-900">{selected.senderName}</p>
                      <p>{selected.senderEmail}</p>
                      <p>{selected.senderPhone}</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                      {t("detail.recipient")}
                    </h3>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                      <p className="font-medium text-neutral-900">{selected.recipientName}</p>
                      <p>{selected.recipientPhone}</p>
                      <p>
                        {selected.recipientAddress}, {selected.recipientCity}
                        {selected.recipientProvince ? `, ${selected.recipientProvince}` : ""}
                      </p>
                    </div>
                  </section>

                  <section className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-neutral-500">{t("detail.occasion")}</p>
                      <p className="mt-1 text-sm text-neutral-800">{selected.occasion ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        {t("detail.preferredDeliveryDate")}
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">
                        {selected.preferredDeliveryDate ?? "—"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-neutral-500">{t("detail.budget")}</p>
                      <p className="mt-1 text-sm text-neutral-800">{selected.budgetNote ?? "—"}</p>
                    </div>
                  </section>

                  {selected.itemType === "DRESS" ? (
                    <section className="rounded-xl border border-[#0f3460]/15 bg-[#0f3460]/5 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-[#0f3460]">
                        {t("detail.dressDetails")}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium text-neutral-500">{t("detail.color")}</p>
                          <p className="mt-1 text-sm text-neutral-800">{selected.dressColor ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-500">{t("detail.size")}</p>
                          <p className="mt-1 text-sm text-neutral-800">{selected.dressSize ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-500">{t("detail.style")}</p>
                          <p className="mt-1 text-sm text-neutral-800">
                            {selected.dressSleeveType ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-500">{t("detail.length")}</p>
                          <p className="mt-1 text-sm text-neutral-800">
                            {selected.dressLength ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-500">{t("detail.fitting")}</p>
                          <p className="mt-1 text-sm text-neutral-800">
                            {selected.dressFitting ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-500">{t("detail.texture")}</p>
                          <p className="mt-1 text-sm text-neutral-800">
                            {selected.dressTexture ?? "—"}
                          </p>
                        </div>
                        <div className="sm:col-span-3">
                          <p className="text-xs font-medium text-neutral-500">{t("detail.for")}</p>
                          <p className="mt-1 text-sm text-neutral-800">{dressForLabel(selected)}</p>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                      {t("detail.preparationNotes")}
                    </h3>
                    <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                      {selected.preparationNotes || "—"}
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                      {t("detail.deliveryInstructions")}
                    </h3>
                    <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                      {selected.deliveryInstructions || "—"}
                    </p>
                  </section>

                  <GiftRequestMediaGallery
                    imageUrls={selected.imageUrls}
                    videoUrls={selected.videoUrls}
                  />

                  <section>
                    <label className="mb-2 block text-sm font-semibold text-neutral-800">
                      {t("detail.updateStatus")}
                    </label>
                    <select
                      value={selected.status}
                      disabled={statusUpdating}
                      onChange={(event) =>
                        handleStatusSelect(event.target.value as GiftRequestStatus)
                      }
                      className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 disabled:opacity-60"
                    >
                      {GIFT_STATUSES.map((status) => (
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
                <AdminGiftRequestQuoteForm
                  request={selected}
                  onUpdated={(updated) => {
                    setSelected((current) =>
                      current ? ({ ...current, ...updated } as GiftRequestRow) : current
                    );
                    setRequests((current) =>
                      current.map((row) =>
                        row.id === updated.id ? ({ ...row, ...updated } as GiftRequestRow) : row
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
