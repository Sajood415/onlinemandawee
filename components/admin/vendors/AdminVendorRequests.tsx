"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ellipsis, Eye, RefreshCw, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import type { VendorStatus } from "@/domain/vendor/vendor-status";
import type { SellerType } from "@/domain/vendor/vendor-types";
import { useRouter } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type SubscriptionStatus = "TRIAL" | "ACTIVE" | "FAILED" | "SUSPENDED";

type VendorListItem = {
  id: string;
  status: VendorStatus;
  onboardingStep: string;
  storeName: string | null;
  storeSlug: string | null;
  businessType: string | null;
  sellerType: SellerType;
  subscriptionStatus: SubscriptionStatus;
  suspensionReason: string | null;
  membershipBillingSuspended: boolean;
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

const sellerTypeClass: Record<SellerType, string> = {
  PLATFORM: "bg-blue-50 text-blue-700",
  THIRD_PARTY: "bg-neutral-100 text-neutral-700",
};

const membershipBadgeClass: Record<SubscriptionStatus | "exempt", string> = {
  exempt: "bg-neutral-100 text-neutral-600",
  TRIAL: "bg-sky-50 text-sky-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-amber-50 text-amber-800",
  SUSPENDED: "bg-rose-50 text-rose-700",
};

const ACTION_MENU_WIDTH = 200;
const ACTION_MENU_HEIGHT = 280;

function clampActionMenuPosition(rect: DOMRect) {
  const maxX = Math.max(12, window.innerWidth - ACTION_MENU_WIDTH - 12);
  const x = Math.min(Math.max(12, rect.right - ACTION_MENU_WIDTH), maxX);
  let y = rect.bottom + 8;
  if (y + ACTION_MENU_HEIGHT > window.innerHeight - 12) {
    y = Math.max(12, rect.top - ACTION_MENU_HEIGHT - 8);
  }
  return { x, y };
}

export function AdminVendorRequests() {
  const t = useTranslations("AdminPages.vendors");
  const locale = useLocale();
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

  const toErrorMessage = useCallback(
    (error: unknown) =>
      error instanceof Error && error.message ? error.message : t("toasts.genericError"),
    [t]
  );

  const displayDate = useCallback(
    (iso: string | null) => {
      if (!iso) return "—";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [locale]
  );

  const storeLabel = useCallback(
    (vendor: VendorListItem) => vendor.storeName ?? t("untitledStore"),
    [t]
  );

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
      toast.error(t("toasts.loadError"), toErrorMessage(error));
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, t, toErrorMessage]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadVendors();
    }
  }, [authLoading, user, loadVendors]);

  const filteredVendors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return vendors;

    return vendors.filter((vendor) => {
      const haystack = [
        vendor.storeName ?? "",
        vendor.storeSlug ?? "",
        vendor.user.fullName,
        vendor.user.email,
        vendor.user.phone,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [vendors, searchQuery]);

  const openActionMenu = (
    vendor: VendorListItem,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const { x, y } = clampActionMenuPosition(rect);
    setActionMenu({ vendor, x, y });
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
      toast.error(t("toasts.reasonRequired"), t("toasts.reasonMin"));
      return;
    }

    if (pendingAction.type === "suspend" && actionReason.trim().length < 3) {
      toast.error(t("toasts.reasonRequired"), t("toasts.reasonMin"));
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
          ? t("toasts.approved")
          : pendingAction.type === "reject"
            ? t("toasts.rejected")
            : pendingAction.type === "suspend"
              ? t("toasts.suspended")
              : t("toasts.reactivated")
      );
      setPendingAction(null);
      setRejectReason("");
      setActionReason("");
      await loadVendors();
    } catch (error) {
      toast.error(
        pendingAction.type === "approve"
          ? t("toasts.approveFailed")
          : pendingAction.type === "reject"
            ? t("toasts.rejectFailed")
            : pendingAction.type === "suspend"
              ? t("toasts.suspendFailed")
              : t("toasts.reactivateFailed"),
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
      toast.error(t("toasts.confirmRequired"), t("toasts.confirmDowngrade"));
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
      toast.success(t("toasts.sellerTypeUpdated"));
      setPendingSellerTypeChange(null);
      setDowngradeConfirmed(false);
      await loadVendors();
    } catch (error) {
      toast.error(t("toasts.sellerTypeFailed"), toErrorMessage(error));
    } finally {
      setActionSubmitting(false);
      setVendorBusy(vendor.id, false);
    }
  };

  const columns = useMemo<ColumnDef<VendorListItem>[]>(
    () => [
      {
        header: t("columns.vendor"),
        accessorKey: "user.fullName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-semibold text-neutral-900">{row.original.user.fullName}</p>
            <p className="text-xs text-neutral-500">{row.original.user.email}</p>
          </div>
        ),
      },
      {
        header: t("columns.store"),
        accessorKey: "storeName",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-medium text-neutral-800">{storeLabel(row.original)}</p>
            <p className="text-xs text-neutral-500">{row.original.storeSlug ?? "—"}</p>
          </div>
        ),
      },
      {
        header: t("columns.businessType"),
        accessorKey: "businessType",
        cell: ({ row }) => {
          const type = row.original.businessType;
          if (type === "INDIVIDUAL" || type === "REGISTERED_BUSINESS") {
            return t(`businessTypes.${type}`);
          }
          return type ?? "—";
        },
      },
      {
        header: t("columns.sellerType"),
        accessorKey: "sellerType",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              sellerTypeClass[row.original.sellerType]
            }`}
          >
            {t(`sellerTypes.${row.original.sellerType}`)}
          </span>
        ),
      },
      {
        header: t("columns.membership"),
        accessorKey: "subscriptionStatus",
        cell: ({ row }) => {
          const vendor = row.original;
          if (vendor.sellerType === "PLATFORM") {
            return (
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${membershipBadgeClass.exempt}`}
              >
                {t("membership.exempt")}
              </span>
            );
          }
          return (
            <div className="space-y-1">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  membershipBadgeClass[vendor.subscriptionStatus]
                }`}
              >
                {t(`membership.${vendor.subscriptionStatus}`)}
              </span>
              {vendor.membershipBillingSuspended ? (
                <p className="text-[11px] font-medium text-rose-600">
                  {t("membership.billingHold")}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        header: t("columns.created"),
        accessorKey: "createdAt",
        cell: ({ row }) => displayDate(row.original.createdAt),
      },
      {
        header: t("columns.submitted"),
        accessorKey: "submittedAt",
        cell: ({ row }) => displayDate(row.original.submittedAt),
      },
      {
        header: t("columns.status"),
        accessorKey: "status",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              statusBadgeClass[row.original.status]
            }`}
          >
            {t(`statuses.${row.original.status}`)}
          </span>
        ),
      },
      {
        header: t("columns.actions"),
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={t("openActions")}
              >
                <Ellipsis className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [busyMap, displayDate, storeLabel, t]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pe-3 ps-9 text-sm text-neutral-700 outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
          >
            {statusFilters.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? t("allStatuses") : t(`statuses.${status}`)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadVendors()}
            disabled={loadingList}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      </div>

      {loadingList ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-14 text-center text-sm text-neutral-500">
          {t("loadingList")}
        </div>
      ) : (
        <DataTable
          data={filteredVendors}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage={
            searchQuery.trim() ? t("emptySearch") : t("emptyFilter")
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
            aria-label={t("closeMenu")}
          />
          <div
            className="fixed z-50 w-[200px] overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-xl"
            style={{ left: actionMenu.x, top: actionMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                setActionMenu(null);
                router.push(`/admin/vendors/${actionMenu.vendor.id}`);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-neutral-700 transition hover:bg-neutral-50"
            >
              <Eye className="h-4 w-4" />
              {t("actions.review")}
            </button>
            {actionMenu.vendor.status === "PENDING_APPROVAL" ? (
              <>
                <button
                  type="button"
                  onClick={() => openConfirmModal("approve", actionMenu.vendor)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-emerald-700 transition hover:bg-emerald-50"
                >
                  {t("actions.approve")}
                </button>
                <button
                  type="button"
                  onClick={() => openConfirmModal("reject", actionMenu.vendor)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-rose-700 transition hover:bg-rose-50"
                >
                  {t("actions.reject")}
                </button>
              </>
            ) : null}
            {actionMenu.vendor.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => openConfirmModal("suspend", actionMenu.vendor)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-neutral-700 transition hover:bg-neutral-50"
              >
                {t("actions.suspend")}
              </button>
            ) : null}
            {actionMenu.vendor.status === "SUSPENDED" ? (
              <button
                type="button"
                onClick={() => openConfirmModal("reactivate", actionMenu.vendor)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-emerald-700 transition hover:bg-emerald-50"
              >
                {t("actions.reactivate")}
              </button>
            ) : null}
            {actionMenu.vendor.status === "ACTIVE" &&
            actionMenu.vendor.sellerType !== "PLATFORM" ? (
              <button
                type="button"
                onClick={() => openSellerTypeModal(actionMenu.vendor, "PLATFORM")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-blue-700 transition hover:bg-blue-50"
              >
                {t("actions.setPlatform")}
              </button>
            ) : null}
            {actionMenu.vendor.status === "ACTIVE" &&
            actionMenu.vendor.sellerType !== "THIRD_PARTY" ? (
              <button
                type="button"
                onClick={() => openSellerTypeModal(actionMenu.vendor, "THIRD_PARTY")}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-neutral-700 transition hover:bg-neutral-50"
              >
                {t("actions.setThirdParty")}
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
                ? t("confirm.approveTitle")
                : pendingAction.type === "reject"
                  ? t("confirm.rejectTitle")
                  : pendingAction.type === "suspend"
                    ? t("confirm.suspendTitle")
                    : t("confirm.reactivateTitle")}
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              {pendingAction.type === "approve"
                ? t("confirm.approveBody")
                : pendingAction.type === "reject"
                  ? t("confirm.rejectBody")
                  : pendingAction.type === "suspend"
                    ? t("confirm.suspendBody")
                    : pendingAction.vendor.membershipBillingSuspended
                      ? t("confirm.reactivateBillingBody")
                      : t("confirm.reactivateBody")}
            </p>
            <p className="mt-2 text-sm font-medium text-neutral-800">
              {storeLabel(pendingAction.vendor)}
            </p>

            {pendingAction.type === "reject" ? (
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
                placeholder={t("confirm.rejectPlaceholder")}
              />
            ) : null}

            {pendingAction.type === "suspend" ? (
              <textarea
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
                placeholder={t("confirm.suspendPlaceholder")}
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
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {t("confirm.cancel")}
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
                  ? t("confirm.submitting")
                  : pendingAction.type === "approve"
                    ? t("actions.approve")
                    : pendingAction.type === "reject"
                      ? t("actions.reject")
                      : pendingAction.type === "suspend"
                        ? t("actions.suspend")
                        : t("actions.reactivate")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingSellerTypeChange ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-neutral-900">
              {t("confirm.sellerTypeTitle")}
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              {t("confirm.sellerTypeBody", {
                store: storeLabel(pendingSellerTypeChange.vendor),
                type: t(`sellerTypes.${pendingSellerTypeChange.targetSellerType}`),
              })}
            </p>
            {pendingSellerTypeChange.targetSellerType === "PLATFORM" ? (
              <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                {t("confirm.platformOnlyActive")}
              </p>
            ) : null}
            {pendingSellerTypeChange.vendor.sellerType === "PLATFORM" &&
            pendingSellerTypeChange.targetSellerType === "THIRD_PARTY" ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">
                  {t("confirm.downgradeWarn")}
                </p>
                <label className="mt-2 flex items-start gap-2 text-xs text-amber-900">
                  <input
                    type="checkbox"
                    checked={downgradeConfirmed}
                    onChange={(event) => setDowngradeConfirmed(event.target.checked)}
                    className="mt-0.5"
                  />
                  {t("confirm.downgradeConfirm")}
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
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {t("confirm.cancel")}
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
                {actionSubmitting ? t("confirm.saving") : t("confirm.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
