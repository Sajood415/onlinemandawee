"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ellipsis, Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import type { VendorStatus } from "@/domain/vendor/vendor-status";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
import { useRouter } from "@/i18n/navigation";

type VendorListItem = {
  id: string;
  status: VendorStatus;
  onboardingStep: string;
  storeName: string | null;
  storeSlug: string | null;
  businessType: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    status: string;
  };
};

type StatusFilter = "ALL" | VendorStatus;

type PendingAction =
  | {
      type: "approve" | "reject";
      vendor: VendorListItem;
    }
  | null;

type ActionMenuState = {
  vendor: VendorListItem;
  x: number;
  y: number;
};

const statusFilters: StatusFilter[] = [
  "ALL",
  "PENDING_APPROVAL",
  "ACTIVE",
  "REJECTED",
  "SUSPENDED",
  "ONBOARDING",
];

const statusBadgeClass: Record<VendorStatus, string> = {
  ONBOARDING: "bg-sky-50 text-sky-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  SUSPENDED: "bg-neutral-200 text-neutral-700",
};

const displayDate = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Something went wrong";

export function AdminVendorRequests() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING_APPROVAL");
  const [loadingList, setLoadingList] = useState(true);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const setVendorBusy = (vendorId: string, busy: boolean) => {
    setBusyMap((prev) => ({ ...prev, [vendorId]: busy }));
  };

  const loadVendors = useCallback(async () => {
    setLoadingList(true);
    try {
      const query = statusFilter === "ALL" ? "" : `?status=${statusFilter}`;
      const response = await fetchWithAuth(`/api/admin/vendors${query}`);
      const data = await parseApiResponse<VendorListItem[]>(response);
      setVendors(data);
    } catch (error) {
      toast.error("Failed to load vendors", toErrorMessage(error));
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadVendors();
    }
  }, [authLoading, user, loadVendors]);

  const openActionMenu = (
    vendor: VendorListItem,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActionMenu({
      vendor,
      x: Math.max(12, rect.right - 176),
      y: rect.bottom + 8,
    });
  };

  const openConfirmModal = (type: "approve" | "reject", vendor: VendorListItem) => {
    setActionMenu(null);
    setPendingAction({ type, vendor });
    setRejectReason("");
  };

  const submitAction = async () => {
    if (!pendingAction) return;
    const vendorId = pendingAction.vendor.id;

    if (pendingAction.type === "reject" && rejectReason.trim().length < 3) {
      toast.error("Reason is required", "Please provide at least 3 characters.");
      return;
    }

    setVendorBusy(vendorId, true);
    setActionSubmitting(true);
    try {
      const response =
        pendingAction.type === "approve"
          ? await fetchWithAuth(`/api/admin/vendors/${vendorId}/approve`, {
              method: "POST",
            })
          : await fetchWithAuth(`/api/admin/vendors/${vendorId}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: rejectReason.trim() }),
            });

      await parseApiResponse(response);
      toast.success(
        pendingAction.type === "approve" ? "Vendor approved" : "Vendor disapproved"
      );
      setPendingAction(null);
      setRejectReason("");
      await loadVendors();
    } catch (error) {
      toast.error(
        pendingAction.type === "approve" ? "Approval failed" : "Disapproval failed",
        toErrorMessage(error)
      );
    } finally {
      setActionSubmitting(false);
      setVendorBusy(vendorId, false);
    }
  };

  const columns = useMemo<ColumnDef<VendorListItem>[]>(
    () => [
      {
        header: "Vendor",
        accessorKey: "user.fullName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-semibold text-neutral-900">{row.original.user.fullName}</p>
            <p className="text-xs text-neutral-500">{row.original.user.email}</p>
          </div>
        ),
      },
      {
        header: "Store",
        accessorKey: "storeName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-neutral-800">
              {row.original.storeName ?? "Untitled store"}
            </p>
            <p className="text-xs text-neutral-500">{row.original.storeSlug ?? "—"}</p>
          </div>
        ),
      },
      {
        header: "Business Type",
        accessorKey: "businessType",
        cell: ({ row }) => row.original.businessType ?? "—",
      },
      {
        header: "Submitted",
        accessorKey: "submittedAt",
        cell: ({ row }) => displayDate(row.original.submittedAt),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              statusBadgeClass[row.original.status]
            }`}
          >
            {row.original.status.replaceAll("_", " ")}
          </span>
        ),
      },
      {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => {
          const vendor = row.original;
          const busy = !!busyMap[vendor.id];
          return (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={(event) => openActionMenu(vendor, event)}
                disabled={busy}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Open vendor actions"
              >
                <Ellipsis className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [busyMap]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-neutral-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#0f3460]">Vendor Requests</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Review submitted vendor applications and approve or disapprove them.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {statusFilters.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "All statuses" : status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loadingList ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-14 text-center text-sm text-neutral-600 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          Loading vendors...
        </div>
      ) : (
        <DataTable
          data={vendors}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage="No vendors match the selected status."
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      {actionMenu ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setActionMenu(null)}
            aria-label="Close action menu"
          />
          <div
            className="fixed z-50 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-xl"
            style={{ left: actionMenu.x, top: actionMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                setActionMenu(null);
                router.push(`/admin/vendors/${actionMenu.vendor.id}`);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
            >
              <Eye className="h-4 w-4" />
              Review
            </button>
            {actionMenu.vendor.status === "PENDING_APPROVAL" ? (
              <>
                <button
                  type="button"
                  onClick={() => openConfirmModal("approve", actionMenu.vendor)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-emerald-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => openConfirmModal("reject", actionMenu.vendor)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
                >
                  Disapprove
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {pendingAction ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-neutral-900">
              {pendingAction.type === "approve"
                ? "Approve vendor?"
                : "Disapprove vendor?"}
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              {pendingAction.type === "approve"
                ? "This will activate the vendor account."
                : "This will reject the vendor request."}
            </p>
            <p className="mt-2 text-sm font-medium text-neutral-800">
              {pendingAction.vendor.storeName ?? "Untitled store"}
            </p>

            {pendingAction.type === "reject" ? (
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Reason for disapproval"
              />
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setRejectReason("");
                }}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitAction()}
                disabled={actionSubmitting}
                className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  pendingAction.type === "approve" ? "bg-emerald-600" : "bg-rose-600"
                }`}
              >
                {actionSubmitting
                  ? "Submitting..."
                  : pendingAction.type === "approve"
                    ? "Approve"
                    : "Disapprove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
