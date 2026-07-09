"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Gift, Loader2, Search, X } from "lucide-react";
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

const STATUS_FILTERS: Array<"ALL" | GiftRequestStatus> = [
  "ALL",
  "SUBMITTED",
  "REVIEWING",
  "AWAITING_PAYMENT",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const STATUS_LABELS: Record<GiftRequestStatus, string> = {
  SUBMITTED: "Submitted",
  REVIEWING: "Reviewing",
  AWAITING_PAYMENT: "Awaiting payment",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_BADGE: Record<GiftRequestStatus, string> = {
  SUBMITTED: "bg-amber-50 text-amber-700",
  REVIEWING: "bg-sky-50 text-sky-700",
  AWAITING_PAYMENT: "bg-orange-50 text-orange-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-neutral-200 text-neutral-700",
};

const displayDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Something went wrong";

function StatusBadge({ status }: { status: GiftRequestStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function AdminGiftRequests() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [requests, setRequests] = useState<GiftRequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<GiftRequestRow | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const query = params.toString();
      const response = await fetchWithAuth(`/api/admin/gift-requests${query ? `?${query}` : ""}`);
      const data = await parseApiResponse<GiftRequestRow[]>(response);
      setRequests(data);
    } catch (error) {
      toast.error("Failed to load gift requests", toErrorMessage(error));
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter]);

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

  const columns = useMemo<ColumnDef<GiftRequestRow>[]>(
    () => [
      {
        accessorKey: "requestNumber",
        header: "Request #",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-[#0f3460]">
            {row.original.requestNumber}
          </span>
        ),
      },
      {
        accessorKey: "senderName",
        header: "Sender",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.senderName}</p>
            <p className="text-xs text-neutral-500">{row.original.senderEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: "recipientName",
        header: "Recipient",
        cell: ({ row }) => (
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-neutral-900">{row.original.recipientName}</p>
              {row.original.itemType === "DRESS" ? (
                <span className="rounded-full bg-[#0f3460]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0f3460]">
                  Dress
                </span>
              ) : null}
            </div>
            <p className="text-xs text-neutral-500">{row.original.recipientCity}</p>
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

  const handleStatusChange = async (status: GiftRequestStatus) => {
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
      toast.success("Status updated");
    } catch (error) {
      toast.error("Could not update status", toErrorMessage(error));
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
            <Gift className="h-3.5 w-3.5" />
            Gift requests
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Personalized gift requests</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Review customer gift requests for relatives in Afghanistan.
          </p>
        </div>
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
            placeholder="Search request #, sender, recipient..."
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
          data={filteredRequests}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage="No gift requests found."
        />
      )}

      {selected ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-neutral-100 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Gift request
                </p>
                <h2 className="mt-1 font-mono text-lg font-bold text-[#0f3460]">
                  {selected.requestNumber}
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
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Sender
                </h3>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                  <p className="font-medium text-neutral-900">{selected.senderName}</p>
                  <p>{selected.senderEmail}</p>
                  <p>{selected.senderPhone}</p>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Recipient in Afghanistan
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Occasion
                  </p>
                  <p className="mt-1 text-sm text-neutral-800">{selected.occasion ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Preferred delivery date
                  </p>
                  <p className="mt-1 text-sm text-neutral-800">
                    {selected.preferredDeliveryDate ?? "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Budget note
                  </p>
                  <p className="mt-1 text-sm text-neutral-800">{selected.budgetNote ?? "—"}</p>
                </div>
              </section>

              {selected.itemType === "DRESS" ? (
                <section className="rounded-xl border border-[#0f3460]/15 bg-[#0f3460]/5 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#0f3460]">
                    Dress details
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Color
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">{selected.dressColor ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Size
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">{selected.dressSize ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Sleeve type
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">
                        {selected.dressSleeveType ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Length
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">{selected.dressLength ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Fitting
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">{selected.dressFitting ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Fabric / texture
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">{selected.dressTexture ?? "—"}</p>
                    </div>
                    <div className="sm:col-span-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        For
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">
                        {[
                          selected.dressForMale ? "Male" : null,
                          selected.dressForFemale ? "Female" : null,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              <section>
                <h3 className="mb-2 text-sm font-semibold text-neutral-800">Preparation notes</h3>
                <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                  {selected.preparationNotes}
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                  Delivery instructions
                </h3>
                <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                  {selected.deliveryInstructions}
                </p>
              </section>

              <GiftRequestMediaGallery
                imageUrls={selected.imageUrls}
                videoUrls={selected.videoUrls}
              />

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

              <section>
                <label className="mb-2 block text-sm font-semibold text-neutral-800">
                  Update status
                </label>
                <select
                  value={selected.status}
                  disabled={statusUpdating}
                  onChange={(event) =>
                    void handleStatusChange(event.target.value as GiftRequestStatus)
                  }
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 disabled:opacity-60"
                >
                  {(Object.keys(STATUS_LABELS) as GiftRequestStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
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
