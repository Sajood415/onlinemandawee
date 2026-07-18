"use client";

import { Loader2, MessageSquareWarning, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import type {
  RefundCaseListItem,
  RefundCaseStatus,
  RefundListResponse,
} from "@/components/refunds/refund-types";
import {
  formatRefundDate,
  formatRefundMoney,
} from "@/components/refunds/format-refund-money";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const TABS = ["needs_response", "escalated", "resolved"] as const;
type DisputeTab = (typeof TABS)[number];

const TAB_STATUS: Record<DisputeTab, RefundCaseStatus | undefined> = {
  needs_response: "WAITING_VENDOR",
  escalated: "ESCALATED_ADMIN",
  resolved: "RESOLVED",
};

export default function VendorDisputesPage() {
  const t = useTranslations("VendorPages.disputes");
  const tDisputes = useTranslations("Disputes");
  const locale = useLocale();
  const { isLoading: authLoading } = useDashboardGuard("VENDOR");

  const [tab, setTab] = useState<DisputeTab>("needs_response");
  const [items, setItems] = useState<RefundCaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<
    RefundListResponse["pagination"] | null
  >(null);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      const status = TAB_STATUS[tab];
      if (status) params.set("status", status);
      const response = await fetchWithAuth(
        `/api/vendor/refunds?${params.toString()}`
      );
      const data = await parseApiResponse<RefundListResponse>(response);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, tab, t]);

  useEffect(() => {
    if (!authLoading) void loadDisputes();
  }, [authLoading, loadDisputes]);

  const empty = useMemo(
    () => !loading && items.length === 0,
    [items.length, loading]
  );

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            {t("subtitle")}
          </p>
          <Link
            href="/vendor/orders"
            className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t("ordersLink")}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void loadDisputes()}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : undefined}
          />
          {t("refresh")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="-mx-1 flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-4 sm:px-5">
          {TABS.map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setPage(1);
                  setTab(key);
                }}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {t(`tabs.${key}`)}
              </button>
            );
          })}
        </div>

        {authLoading || loading ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-sm text-neutral-600">
            <Loader2 className="animate-spin text-neutral-400" size={28} />
          </div>
        ) : empty ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
              <MessageSquareWarning
                size={24}
                className="text-neutral-400"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800">
                {t("empty")}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{t("emptyHint")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-4 py-4 sm:px-5">
              {items.map((item) => {
                const statusLabel = item.decision
                  ? tDisputes(`decisions.${item.decision.decisionType}`)
                  : tDisputes(`statuses.${item.status}`);
                const needsYou = item.status === "WAITING_VENDOR";

                return (
                  <Link
                    key={item.id}
                    href={`/vendor/disputes/${item.id}`}
                    className={`block rounded-2xl border bg-white p-4 transition hover:shadow-md ${
                      needsYou
                        ? "border-amber-200 hover:border-amber-300"
                        : "border-neutral-200 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-primary">
                            #{item.order.orderNumber}
                          </p>
                          <RefundStatusBadge
                            status={item.status}
                            decision={item.decision}
                            label={statusLabel}
                          />
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-neutral-800">
                          {item.orderItem.productName}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.customer.fullName} ·{" "}
                          {formatRefundDate(item.createdAt, locale)}
                        </p>
                        {item.vendorResponseDueAt && needsYou ? (
                          <p className="mt-1.5 text-xs font-semibold text-amber-800">
                            {t("respondBy", {
                              date: formatRefundDate(
                                item.vendorResponseDueAt,
                                locale
                              ),
                            })}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-bold text-primary">
                        {formatRefundMoney(
                          item.requestedAmount,
                          item.order.currency,
                          locale
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
            {pagination ? (
              <PaginationFooter
                pageIndex={page - 1}
                pageCount={pagination.totalPages}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50]}
                onPageIndexChange={(pageIndex) => setPage(pageIndex + 1)}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  setPage(1);
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
