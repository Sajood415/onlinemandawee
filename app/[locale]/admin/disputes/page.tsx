"use client";

import { Loader2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { AdminDashboardLayout } from "@/components/dashboard/AdminDashboardLayout";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import type { RefundCaseListItem, RefundCaseStatus, RefundListResponse } from "@/components/refunds/refund-types";
import { formatRefundDate, formatRefundMoney } from "@/components/refunds/format-refund-money";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const STATUS_FILTERS: Array<"ALL" | RefundCaseStatus> = [
  "ALL",
  "WAITING_VENDOR",
  "ESCALATED_ADMIN",
  "RESOLVED",
];

export default function AdminDisputesPage() {
  const locale = useLocale();
  const { isLoading: authLoading } = useDashboardGuard("ADMIN");
  const [items, setItems] = useState<RefundCaseListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ESCALATED_ADMIN");
  const [searchQuery, setSearchQuery] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<RefundListResponse["pagination"] | null>(null);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (overdueOnly) params.set("overdueOnly", "true");
      const response = await fetchWithAuth(`/api/admin/refunds?${params.toString()}`);
      const data = await parseApiResponse<RefundListResponse>(response);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [overdueOnly, page, searchQuery, statusFilter]);

  useEffect(() => {
    if (!authLoading) void loadDisputes();
  }, [authLoading, loadDisputes]);

  const handleEscalateOverdue = async () => {
    setEscalating(true);
    try {
      const response = await fetchWithAuth("/api/admin/refunds/escalate-overdue", {
        method: "POST",
      });
      const data = await parseApiResponse<{ count: number }>(response);
      toast.success(`${data.count} overdue case${data.count === 1 ? "" : "s"} escalated`);
      await loadDisputes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run escalation");
    } finally {
      setEscalating(false);
    }
  };

  const empty = useMemo(() => !loading && items.length === 0, [items.length, loading]);

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Disputes</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Review escalated refund cases and record final decisions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleEscalateOverdue()}
              disabled={escalating}
              className="inline-flex items-center gap-2 rounded-lg border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              {escalating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Escalate overdue
            </button>
            <button
              type="button"
              onClick={() => void loadDisputes()}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setPage(1);
                setSearchQuery(event.target.value);
              }}
              placeholder="Search order, customer, product, reason…"
              className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => {
                setPage(1);
                setOverdueOnly(event.target.checked);
              }}
            />
            Overdue vendor SLA only
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setPage(1);
                setStatusFilter(option);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                statusFilter === option ? "bg-primary text-white" : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {option === "ALL" ? "All" : option.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        {authLoading || loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : empty ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
            <p className="text-sm text-neutral-500">No disputes match your filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/admin/disputes/${item.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.order.orderNumber}</p>
                    <p className="mt-1 text-sm text-neutral-700">{item.orderItem.productName}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {item.customer.fullName} · {item.vendor.storeName ?? "Vendor"} ·{" "}
                      {formatRefundDate(item.createdAt, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <RefundStatusBadge status={item.status} />
                    <p className="mt-2 text-sm font-semibold text-neutral-900">
                      {formatRefundMoney(item.requestedAmount, item.order.currency, locale)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-neutral-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </AdminDashboardLayout>
  );
}
