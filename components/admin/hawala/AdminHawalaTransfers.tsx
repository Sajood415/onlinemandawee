"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Loader2, RefreshCw, Search, Settings2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type HawalaTransferStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type HawalaTransferRow = {
  id: string;
  transferNumber: string;
  status: HawalaTransferStatus;
  senderName: string;
  senderPhone: string;
  senderEmail: string | null;
  senderCountry: string;
  senderAddress: string;
  senderBankName: string;
  senderAccountNumber: string;
  receiverName: string;
  receiverPhone: string;
  receiverCountry: string;
  receiverAddress: string;
  receiverBankName: string;
  receiverAccountNumber: string;
  sendAmountMinor: number;
  sendCurrency: string;
  receiveAmountMinor: number;
  receiveCurrency: string;
  exchangeRate: number;
  note: string | null;
  adminNote: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
};

type StatusTab = "ALL" | HawalaTransferStatus;

const STATUS_TABS: StatusTab[] = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "DELIVERED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

const HAWALA_STATUSES = STATUS_TABS.filter(
  (status): status is HawalaTransferStatus => status !== "ALL"
);

const NEEDS_CONFIRM: HawalaTransferStatus[] = [
  "REJECTED",
  "FAILED",
  "CANCELLED",
  "COMPLETED",
];

const CLOSED_STATUSES: HawalaTransferStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REJECTED",
];

const STATUS_BADGE: Record<HawalaTransferStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-sky-50 text-sky-700",
  REJECTED: "bg-red-50 text-red-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  DELIVERED: "bg-indigo-50 text-indigo-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
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

function formatMoney(amountMinor: number, currency: string, locale: string) {
  return `${(amountMinor / 100).toLocaleString(locale, {
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function StatusBadge({ status }: { status: HawalaTransferStatus }) {
  const t = useTranslations("AdminPages.hawala");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {t(`statuses.${status}`)}
    </span>
  );
}

export function AdminHawalaTransfers() {
  const t = useTranslations("AdminPages.hawala");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [transfers, setTransfers] = useState<HawalaTransferRow[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<HawalaTransferRow | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [adminNoteDraft, setAdminNoteDraft] = useState("");
  const [pendingStatus, setPendingStatus] = useState<HawalaTransferStatus | null>(null);

  const statusLabel = useCallback(
    (status: HawalaTransferStatus) => t(`statuses.${status}`),
    [t]
  );

  const loadTransfers = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (statusTab !== "ALL") params.set("status", statusTab);
      const query = params.toString();
      const response = await fetchWithAuth(`/api/admin/hawala${query ? `?${query}` : ""}`);
      const data = await parseApiResponse<HawalaTransferRow[]>(response);
      setTransfers(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadError"));
    } finally {
      setLoadingList(false);
    }
  }, [statusTab, t]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadTransfers();
    }
  }, [authLoading, user, loadTransfers]);

  useEffect(() => {
    setAdminNoteDraft(selected?.adminNote ?? "");
  }, [selected]);

  const filteredTransfers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return transfers;
    return transfers.filter((row) => {
      const haystack = [
        row.transferNumber,
        row.senderName,
        row.senderPhone,
        row.receiverName,
        row.receiverPhone,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [transfers, searchQuery]);

  const applyStatusChange = async (status: HawalaTransferStatus) => {
    if (!selected) return;
    setStatusUpdating(true);
    try {
      const response = await fetchWithAuth(`/api/admin/hawala/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: adminNoteDraft }),
      });
      const updated = await parseApiResponse<HawalaTransferRow>(response);
      setSelected(updated);
      setTransfers((current) =>
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

  const handleStatusSelect = (status: HawalaTransferStatus) => {
    if (!selected || status === selected.status) return;
    if (NEEDS_CONFIRM.includes(status)) {
      setPendingStatus(status);
      return;
    }
    void applyStatusChange(status);
  };

  const handleSaveNote = async () => {
    if (!selected) return;
    setStatusUpdating(true);
    try {
      const response = await fetchWithAuth(`/api/admin/hawala/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selected.status, adminNote: adminNoteDraft }),
      });
      const updated = await parseApiResponse<HawalaTransferRow>(response);
      setSelected(updated);
      setTransfers((current) =>
        current.map((row) => (row.id === updated.id ? updated : row))
      );
      toast.success(t("noteSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("noteSaveFailed"));
    } finally {
      setStatusUpdating(false);
    }
  };

  const openDetail = (row: HawalaTransferRow) => {
    setSelected(row);
    setPendingStatus(null);
  };

  const closeDetail = () => {
    setSelected(null);
    setPendingStatus(null);
  };

  const columns = useMemo<ColumnDef<HawalaTransferRow>[]>(
    () => [
      {
        accessorKey: "transferNumber",
        header: t("columns.transferNumber"),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-[#0f3460]">
            {row.original.transferNumber}
          </span>
        ),
      },
      {
        accessorKey: "senderName",
        header: t("columns.sender"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.senderName}</p>
            <p className="text-xs text-neutral-500">{row.original.senderPhone}</p>
          </div>
        ),
      },
      {
        accessorKey: "receiverName",
        header: t("columns.receiver"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.receiverName}</p>
            <p className="text-xs text-neutral-500">{row.original.receiverCountry}</p>
          </div>
        ),
      },
      {
        id: "amount",
        header: t("columns.amount"),
        cell: ({ row }) => (
          <div className="text-sm text-neutral-800">
            <p>
              {formatMoney(
                row.original.sendAmountMinor,
                row.original.sendCurrency,
                locale
              )}
            </p>
            <p className="text-xs text-neutral-500">
              →{" "}
              {formatMoney(
                row.original.receiveAmountMinor,
                row.original.receiveCurrency,
                locale
              )}
            </p>
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

  const isClosed = selected ? CLOSED_STATUSES.includes(selected.status) : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadTransfers()}
            disabled={loadingList}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
          <Link
            href="/admin/hawala/exchange-rates"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            <Settings2 className="h-4 w-4" />
            {t("manageRates")}
          </Link>
        </div>
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
          data={filteredTransfers}
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
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-neutral-100 bg-white px-6 py-4">
              <div>
                <h2 className="font-mono text-lg font-bold text-[#0f3460]">
                  {selected.transferNumber}
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

            <div className="space-y-5 px-6 py-5">
              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                    {t("detail.sender")}
                  </h3>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                    <p className="font-medium text-neutral-900">{selected.senderName}</p>
                    <p>{selected.senderPhone}</p>
                    {selected.senderEmail ? <p>{selected.senderEmail}</p> : null}
                    <p>
                      {selected.senderAddress}, {selected.senderCountry}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      {t("detail.bank", {
                        bank: selected.senderBankName,
                        account: selected.senderAccountNumber,
                      })}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                    {t("detail.receiver")}
                  </h3>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                    <p className="font-medium text-neutral-900">{selected.receiverName}</p>
                    <p>{selected.receiverPhone}</p>
                    <p>
                      {selected.receiverAddress}, {selected.receiverCountry}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      {t("detail.bank", {
                        bank: selected.receiverBankName,
                        account: selected.receiverAccountNumber,
                      })}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-[#0f3460]/15 bg-[#0f3460]/5 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-neutral-700">
                    {formatMoney(
                      selected.sendAmountMinor,
                      selected.sendCurrency,
                      locale
                    )}{" "}
                    →{" "}
                    <span className="text-lg font-bold text-[#0f3460]">
                      {formatMoney(
                        selected.receiveAmountMinor,
                        selected.receiveCurrency,
                        locale
                      )}
                    </span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {t("detail.rate", {
                      from: selected.sendCurrency,
                      rate: selected.exchangeRate.toLocaleString(locale, {
                        maximumFractionDigits: 4,
                      }),
                      to: selected.receiveCurrency,
                    })}
                  </p>
                </div>
              </section>

              {selected.note ? (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                    {t("detail.customerNote")}
                  </h3>
                  <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                    {selected.note}
                  </p>
                </section>
              ) : null}

              <section>
                <label className="mb-2 block text-sm font-semibold text-neutral-800">
                  {t("detail.updateStatus")}
                </label>
                <select
                  value={selected.status}
                  disabled={statusUpdating}
                  onChange={(event) =>
                    handleStatusSelect(event.target.value as HawalaTransferStatus)
                  }
                  className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 disabled:opacity-60"
                >
                  {HAWALA_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
                {isClosed ? (
                  <p className="mt-2 text-xs text-amber-700">{t("detail.closedHint")}</p>
                ) : null}
              </section>

              <section>
                <label className="mb-2 block text-sm font-semibold text-neutral-800">
                  {t("detail.adminNote")}
                </label>
                <textarea
                  value={adminNoteDraft}
                  onChange={(event) => setAdminNoteDraft(event.target.value)}
                  disabled={statusUpdating}
                  className="min-h-[90px] w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 disabled:opacity-60"
                  placeholder={t("detail.adminNotePlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => void handleSaveNote()}
                  disabled={statusUpdating}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-60"
                >
                  {statusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {t("detail.saveNote")}
                </button>
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
