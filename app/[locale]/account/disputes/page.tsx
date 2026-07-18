"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import type { RefundCaseListItem, RefundCaseStatus, RefundListResponse } from "@/components/refunds/refund-types";
import { formatRefundDate, formatRefundMoney } from "@/components/refunds/format-refund-money";
import { useCustomerRouteGuard } from "@/components/customer/use-customer-route-guard";
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

export default function CustomerDisputesPage() {
  const locale = useLocale();
  const t = useTranslations("Disputes.list");
  const { isLoading: authLoading } = useCustomerRouteGuard();
  const [items, setItems] = useState<RefundCaseListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<RefundListResponse["pagination"] | null>(null);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const response = await fetchWithAuth(`/api/refunds/my?${params.toString()}`);
      const data = await parseApiResponse<RefundListResponse>(response);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, t]);

  useEffect(() => {
    if (!authLoading) void loadDisputes();
  }, [authLoading, loadDisputes]);

  const empty = useMemo(() => !loading && items.length === 0, [items.length, loading]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDisputes()}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </button>
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
            {t(`filters.${option}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : empty ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-neutral-900">{t("empty")}</p>
          <p className="mt-1 text-sm text-neutral-500">{t("emptyHint")}</p>
          <Link
            href="/account"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            {t("viewOrders")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/account/disputes/${item.id}`}
              className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{item.order.orderNumber}</p>
                  <p className="mt-1 text-sm text-neutral-700">{item.orderItem.productName}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {item.vendor.storeName ?? t("vendorFallback")} ·{" "}
                    {formatRefundDate(item.createdAt, locale)}
                  </p>
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
            {t("previous")}
          </button>
          <span className="text-sm text-neutral-600">
            {t("pageOf", { page: pagination.page, total: pagination.totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            {t("next")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
