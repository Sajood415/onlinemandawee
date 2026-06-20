"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import type { RefundCaseListItem, RefundCaseStatus, RefundListResponse } from "@/components/refunds/refund-types";
import { formatRefundDate, formatRefundMoney } from "@/components/refunds/format-refund-money";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const TAB_STATUS: Record<string, RefundCaseStatus | undefined> = {
  needs_response: "WAITING_VENDOR",
  escalated: "ESCALATED_ADMIN",
  resolved: "RESOLVED",
};

export default function VendorDisputesPage() {
  const locale = useLocale();
  const { isLoading: authLoading } = useDashboardGuard("VENDOR");
  const [tab, setTab] = useState<keyof typeof TAB_STATUS>("needs_response");
  const [items, setItems] = useState<RefundCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<RefundListResponse["pagination"] | null>(null);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      const status = TAB_STATUS[tab];
      if (status) params.set("status", status);
      const response = await fetchWithAuth(`/api/vendor/refunds?${params.toString()}`);
      const data = await parseApiResponse<RefundListResponse>(response);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    if (!authLoading) void loadDisputes();
  }, [authLoading, loadDisputes]);

  const empty = useMemo(() => !loading && items.length === 0, [items.length, loading]);

  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Disputes</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Respond to refund requests within 48 hours.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDisputes()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.keys(TAB_STATUS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setPage(1);
                setTab(key as keyof typeof TAB_STATUS);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                tab === key ? "bg-primary text-white" : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {key.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        {authLoading || loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : empty ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
            <p className="text-sm text-neutral-500">No disputes in this tab.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/vendor/disputes/${item.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.order.orderNumber}</p>
                    <p className="mt-1 text-sm text-neutral-700">{item.orderItem.productName}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {item.customer.fullName} · {formatRefundDate(item.createdAt, locale)}
                    </p>
                    {item.vendorResponseDueAt ? (
                      <p className="mt-1 text-xs font-semibold text-amber-700">
                        Respond by {formatRefundDate(item.vendorResponseDueAt, locale)}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <RefundStatusBadge status={item.status} decision={item.decision} />
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
  );
}
