"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ellipsis, Eye, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import type { SellerType } from "@/domain/vendor/vendor-types";
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
  sellerType: SellerType;
  createdAt: string;
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
      type: "approve" | "reject" | "suspend" | "reactivate";
      vendor: VendorListItem;
    }
  | null;

type ActionMenuState = {
  vendor: VendorListItem;
  x: number;
  y: number;
};

type PendingSellerTypeChange = {
  vendor: VendorListItem;
  targetSellerType: SellerType;
} | null;

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

const sellerTypeClass: Record<SellerType, string> = {
  PLATFORM: "bg-blue-50 text-blue-700",
  THIRD_PARTY: "bg-neutral-100 text-neutral-700",
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Something went wrong";

export function AdminVendorRequests() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [pendingSellerTypeChange, setPendingSellerTypeChange] =
    useState<PendingSellerTypeChange>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [downgradeConfirmed, setDowngradeConfirmed] = useState(false);

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

  const filteredVendors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return vendors;

    return vendors.filter((vendor) => {
      const storeName = (vendor.storeName ?? "").toLowerCase();
      const ownerName = vendor.user.fullName.toLowerCase();
      return storeName.includes(query) || ownerName.includes(query);
    });
  }, [vendors, searchQuery]);

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

  const openConfirmModal = (
    type: "approve" | "reject" | "suspend" | "reactivate",
    vendor: VendorListItem
  ) => {
    setActionMenu(null);
    setPendingAction({ type, vendor });
    setRejectReason("");
    setActionReason("");
  };

  const openSellerTypeModal = (vendor: VendorListItem, targetSellerType: SellerType) => {
    setActionMenu(null);
    setPendingSellerTypeChange({ vendor, targetSellerType });
    setDowngradeConfirmed(false);
  };

  const submitAction = async () => {
    if (!pendingAction) return;
    const vendorId = pendingAction.vendor.id;

    if (pendingAction.type === "reject" && rejectReason.trim().length < 3) {
      toast.error("Reason is required", "Please provide at least 3 characters.");
      return;
    }

    if (pendingAction.type === "suspend" && actionReason.trim().length < 3) {
      toast.error("Reason is required", "Please provide at least 3 characters.");
      return;
    }

    setVendorBusy(vendorId, true);
    setActionSubmitting(true);
    try {
      let response: Response;

      if (pendingAction.type === "approve") {
        response = await fetchWithAuth(`/api/admin/vendors/${vendorId}/approve`, {
          method: "POST",
        });
      } else if (pendingAction.type === "reject") {
        response = await fetchWithAuth(`/api/admin/vendors/${vendorId}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        });
      } else if (pendingAction.type === "suspend") {
        response = await fetchWithAuth(`/api/admin/vendors/${vendorId}/suspend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: actionReason.trim() }),
        });
      } else {
        response = await fetchWithAuth(`/api/admin/vendors/${vendorId}/reactivate`, {
          method: "POST",
        });
      }

      await parseApiResponse(response);
      toast.success(
        pendingAction.type === "approve"
          ? "Vendor approved"
          : pendingAction.type === "reject"
            ? "Vendor disapproved"
            : pendingAction.type === "suspend"
              ? "Vendor suspended"
              : "Vendor reactivated"
      );
      setPendingAction(null);
      setRejectReason("");
      setActionReason("");
      await loadVendors();
    } catch (error) {
      toast.error(
        pendingAction.type === "approve"
          ? "Approval failed"
          : pendingAction.type === "reject"
            ? "Disapproval failed"
            : pendingAction.type === "suspend"
              ? "Suspension failed"
              : "Reactivation failed",
        toErrorMessage(error)
      );
    } finally {
      setActionSubmitting(false);
      setVendorBusy(vendorId, false);
    }
  };

  const submitSellerTypeChange = async () => {
    if (!pendingSellerTypeChange) return;

    const { vendor, targetSellerType } = pendingSellerTypeChange;
    if (
      vendor.sellerType === "PLATFORM" &&
      targetSellerType === "THIRD_PARTY" &&
      !downgradeConfirmed
    ) {
      toast.error("Confirmation required", "Please confirm the downgrade warning.");
      return;
    }

    setVendorBusy(vendor.id, true);
    setActionSubmitting(true);
    try {
      const response = await fetchWithAuth(`/api/admin/vendors/${vendor.id}/seller-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerType: targetSellerType,
          confirmDowngrade:
            vendor.sellerType === "PLATFORM" && targetSellerType === "THIRD_PARTY"
              ? true
              : undefined,
        }),
      });
      await parseApiResponse(response);
      toast.success("Seller type updated");
      setPendingSellerTypeChange(null);
      setDowngradeConfirmed(false);
      await loadVendors();
    } catch (error) {
      toast.error("Seller type update failed", toErrorMessage(error));
    } finally {
      setActionSubmitting(false);
      setVendorBusy(vendor.id, false);
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
        header: "Seller Type",
        accessorKey: "sellerType",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              sellerTypeClass[row.original.sellerType]
            }`}
          >
            {row.original.sellerType === "THIRD_PARTY" ? "THIRD PARTY" : "PLATFORM"}
          </span>
        ),
      },
      {
        header: "Created",
        accessorKey: "createdAt",
        cell: ({ row }) => displayDate(row.original.createdAt),
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name"
                className="w-full rounded-lg border border-neutral-300 bg-white py-2 pe-3 ps-9 text-sm text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
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
        </div>
      </section>

      {loadingList ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-14 text-center text-sm text-neutral-600 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          Loading vendors...
        </div>
      ) : (
        <DataTable
          data={filteredVendors}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage={
            searchQuery.trim()
              ? "No vendors match your search."
              : "No vendors match the selected status."
          }
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
            {actionMenu.vendor.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => openConfirmModal("suspend", actionMenu.vendor)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
              >
                Suspend
              </button>
            ) : null}
            {actionMenu.vendor.status === "SUSPENDED" ? (
              <button
                type="button"
                onClick={() => openConfirmModal("reactivate", actionMenu.vendor)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-emerald-50"
              >
                Reactivate
              </button>
            ) : null}
            {actionMenu.vendor.sellerType !== "PLATFORM" ? (
              <button
                type="button"
                onClick={() => openSellerTypeModal(actionMenu.vendor, "PLATFORM")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-blue-700 transition hover:bg-blue-50"
              >
                Set as PLATFORM
              </button>
            ) : null}
            {actionMenu.vendor.sellerType !== "THIRD_PARTY" ? (
              <button
                type="button"
                onClick={() => openSellerTypeModal(actionMenu.vendor, "THIRD_PARTY")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
              >
                Set as THIRD PARTY
              </button>
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
                : pendingAction.type === "reject"
                  ? "Disapprove vendor?"
                  : pendingAction.type === "suspend"
                    ? "Suspend vendor?"
                    : "Reactivate vendor?"}
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              {pendingAction.type === "approve"
                ? "This will activate the vendor account."
                : pendingAction.type === "reject"
                  ? "This will reject the vendor request."
                  : pendingAction.type === "suspend"
                    ? "This will hide their store from customers and block vendor login."
                    : "This will restore vendor access and show their store again."}
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

            {pendingAction.type === "suspend" ? (
              <textarea
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Reason for suspension"
              />
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setRejectReason("");
                  setActionReason("");
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
                  pendingAction.type === "approve" || pendingAction.type === "reactivate"
                    ? "bg-emerald-600"
                    : pendingAction.type === "reject"
                      ? "bg-rose-600"
                      : "bg-neutral-700"
                }`}
              >
                {actionSubmitting
                  ? "Submitting..."
                  : pendingAction.type === "approve"
                    ? "Approve"
                    : pendingAction.type === "reject"
                      ? "Disapprove"
                      : pendingAction.type === "suspend"
                        ? "Suspend"
                        : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingSellerTypeChange ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-neutral-900">Change seller type?</h4>
            <p className="mt-1 text-sm text-neutral-600">
              Update seller type for{" "}
              <span className="font-semibold text-neutral-800">
                {pendingSellerTypeChange.vendor.storeName ?? "Untitled store"}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-neutral-800">
                {pendingSellerTypeChange.targetSellerType === "THIRD_PARTY"
                  ? "THIRD PARTY"
                  : "PLATFORM"}
              </span>
              .
            </p>
            {pendingSellerTypeChange.targetSellerType === "PLATFORM" ? (
              <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                PLATFORM can only be assigned when vendor status is ACTIVE.
              </p>
            ) : null}
            {pendingSellerTypeChange.vendor.sellerType === "PLATFORM" &&
            pendingSellerTypeChange.targetSellerType === "THIRD_PARTY" ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">
                  This vendor may currently be used for platform-owned delivery routing.
                </p>
                <label className="mt-2 flex items-start gap-2 text-xs text-amber-900">
                  <input
                    type="checkbox"
                    checked={downgradeConfirmed}
                    onChange={(event) => setDowngradeConfirmed(event.target.checked)}
                    className="mt-0.5"
                  />
                  I confirm this downgrade and understand routing may be impacted.
                </label>
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingSellerTypeChange(null);
                  setDowngradeConfirmed(false);
                }}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitSellerTypeChange()}
                disabled={
                  actionSubmitting ||
                  (pendingSellerTypeChange.vendor.sellerType === "PLATFORM" &&
                    pendingSellerTypeChange.targetSellerType === "THIRD_PARTY" &&
                    !downgradeConfirmed)
                }
                className="rounded-lg bg-[#0f3460] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {actionSubmitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
