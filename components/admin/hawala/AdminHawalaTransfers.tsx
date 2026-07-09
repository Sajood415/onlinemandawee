"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Banknote, Eye, Loader2, Search, Settings2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
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

const STATUS_FILTERS: Array<"ALL" | HawalaTransferStatus> = [
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

const STATUS_LABELS: Record<HawalaTransferStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

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

const CLOSED_STATUSES: HawalaTransferStatus[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REJECTED",
];

const displayDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const formatMoney = (amountMinor: number, currency: string) =>
  `${(amountMinor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;

const toErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Something went wrong";

function StatusBadge({ status }: { status: HawalaTransferStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function AdminHawalaTransfers() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [transfers, setTransfers] = useState<HawalaTransferRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<HawalaTransferRow | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [adminNoteDraft, setAdminNoteDraft] = useState("");

  const loadTransfers = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const query = params.toString();
      const response = await fetchWithAuth(`/api/admin/hawala${query ? `?${query}` : ""}`);
      const data = await parseApiResponse<HawalaTransferRow[]>(response);
      setTransfers(data);
    } catch (error) {
      toast.error("Failed to load Hawala transfers", toErrorMessage(error));
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter]);

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

  const columns = useMemo<ColumnDef<HawalaTransferRow>[]>(
    () => [
      {
        accessorKey: "transferNumber",
        header: "Transfer #",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-[#0f3460]">
            {row.original.transferNumber}
          </span>
        ),
      },
      {
        accessorKey: "senderName",
        header: "Sender",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.senderName}</p>
            <p className="text-xs text-neutral-500">{row.original.senderPhone}</p>
          </div>
        ),
      },
      {
        accessorKey: "receiverName",
        header: "Receiver",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.receiverName}</p>
            <p className="text-xs text-neutral-500">{row.original.receiverCountry}</p>
          </div>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="text-sm text-neutral-800">
            <p>{formatMoney(row.original.sendAmountMinor, row.original.sendCurrency)}</p>
            <p className="text-xs text-neutral-500">
              → {formatMoney(row.original.receiveAmountMinor, row.original.receiveCurrency)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="text-sm text-neutral-600">{displayDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelected(row.original)}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-[#0f3460]/30 hover:bg-[#0f3460]/5"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
        ),
      },
    ],
    []
  );

  const handleStatusChange = async (status: HawalaTransferStatus) => {
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
      toast.success("Status updated");
    } catch (error) {
      toast.error("Could not update status", toErrorMessage(error));
    } finally {
      setStatusUpdating(false);
    }
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
      toast.success("Note saved");
    } catch (error) {
      toast.error("Could not save note", toErrorMessage(error));
    } finally {
      setStatusUpdating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#0f3460]/15 bg-[#0f3460]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f3460]">
            <Banknote className="h-3.5 w-3.5" />
            Hawala transfers
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Hawala money transfers</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Review, approve, and track Hawala transfer requests.
          </p>
        </div>
        <Link
          href="/admin/hawala/exchange-rates"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          <Settings2 className="h-4 w-4" />
          Manage exchange rates
        </Link>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === status
                  ? "bg-[#0f3460] text-white"
                  : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {status === "ALL" ? "All" : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search transfer #, sender, receiver..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
          />
        </div>
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
          emptyMessage="No Hawala transfers found."
        />
      )}

      {selected ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-neutral-100 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Hawala transfer
                </p>
                <h2 className="mt-1 font-mono text-lg font-bold text-[#0f3460]">
                  {selected.transferNumber}
                </h2>
                <div className="mt-2">
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    Sender
                  </h3>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                    <p className="font-medium text-neutral-900">{selected.senderName}</p>
                    <p>{selected.senderPhone}</p>
                    {selected.senderEmail ? <p>{selected.senderEmail}</p> : null}
                    <p>
                      {selected.senderAddress}, {selected.senderCountry}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      Bank: {selected.senderBankName} · Acct: {selected.senderAccountNumber}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    Receiver
                  </h3>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                    <p className="font-medium text-neutral-900">{selected.receiverName}</p>
                    <p>{selected.receiverPhone}</p>
                    <p>
                      {selected.receiverAddress}, {selected.receiverCountry}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      Bank: {selected.receiverBankName} · Acct: {selected.receiverAccountNumber}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-[#0f3460]/15 bg-[#0f3460]/5 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-neutral-700">
                    {formatMoney(selected.sendAmountMinor, selected.sendCurrency)} →{" "}
                    <span className="text-lg font-bold text-[#0f3460]">
                      {formatMoney(selected.receiveAmountMinor, selected.receiveCurrency)}
                    </span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    Rate: 1 {selected.sendCurrency} ≈{" "}
                    {selected.exchangeRate.toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}{" "}
                    {selected.receiveCurrency}
                  </p>
                </div>
              </section>

              {selected.note ? (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                    Customer note
                  </h3>
                  <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                    {selected.note}
                  </p>
                </section>
              ) : null}

              <section>
                <label className="mb-2 block text-sm font-semibold text-neutral-800">
                  Update status
                </label>
                <select
                  value={selected.status}
                  disabled={statusUpdating}
                  onChange={(event) =>
                    void handleStatusChange(event.target.value as HawalaTransferStatus)
                  }
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 disabled:opacity-60"
                >
                  {(Object.keys(STATUS_LABELS) as HawalaTransferStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                {CLOSED_STATUSES.includes(selected.status) ? (
                  <p className="mt-2 text-xs text-amber-600">
                    This transfer is closed. Changing status again is disabled once closed
                    unless you pick the same status.
                  </p>
                ) : null}
              </section>

              <section>
                <label className="mb-2 block text-sm font-semibold text-neutral-800">
                  Admin note (visible to customer)
                </label>
                <textarea
                  value={adminNoteDraft}
                  onChange={(event) => setAdminNoteDraft(event.target.value)}
                  disabled={statusUpdating}
                  className="min-h-[90px] w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 disabled:opacity-60"
                  placeholder="Add a note about approval, rejection reason, or delivery details"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveNote()}
                  disabled={statusUpdating}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-60"
                >
                  {statusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save note
                </button>
              </section>

              <p className="text-xs text-neutral-500">
                Submitted {displayDate(selected.createdAt)}
                {selected.updatedAt !== selected.createdAt
                  ? ` · Updated ${displayDate(selected.updatedAt)}`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
