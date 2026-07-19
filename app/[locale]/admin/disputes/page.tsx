"use client";

import { Loader2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import type { RefundCaseListItem, RefundCaseStatus, RefundListResponse } from "@/components/refunds/refund-types";
import { formatRefundDate, formatRefundMoney } from "@/components/refunds/format-refund-money";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type DisputeTab = "needsYou" | "waitingShop" | "done" | "all";

const TAB_TO_STATUS: Record<DisputeTab, "ALL" | RefundCaseStatus> = {
  needsYou: "ESCALATED_ADMIN",
  waitingShop: "WAITING_VENDOR",
  done: "RESOLVED",
  all: "ALL",
};

export default function AdminDisputesPage() {
  const locale = useLocale();
  const t = useTranslations("AdminPages.disputes");
  const { isLoading: authLoading } = useDashboardGuard("ADMIN");
  const [items, setItems] = useState<RefundCaseListItem[]>([]);
  const [tab, setTab] = useState<DisputeTab>("needsYou");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<RefundListResponse["pagination"] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const statusFilter = TAB_TO_STATUS[tab];

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (overdueOnly) params.set("overdueOnly", "true");
      const response = await fetchWithAuth(`/api/admin/refunds?${params.toString()}`);
      const data = await parseApiResponse<RefundListResponse>(response);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, overdueOnly, page, pageSize, statusFilter, t]);

  useEffect(() => {
    if (!authLoading) void loadDisputes();
  }, [authLoading, loadDisputes]);

  const empty = useMemo(() => !loading && items.length === 0, [items.length, loading]);

  const tabs: Array<{ id: DisputeTab; label: string }> = [
    { id: "needsYou", label: t("tabs.needsYou") },
    { id: "waitingShop", label: t("tabs.waitingShop") },
    { id: "done", label: t("tabs.done") },
    { id: "all", label: t("tabs.all") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
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

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div
          role="tablist"
          aria-label={t("title")}
          className="flex gap-0 overflow-x-auto border-b border-neutral-200"
        >
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setPage(1);
                  setTab(item.id);
                }}
                className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition sm:px-6 ${
                  active
                    ? "text-[#0f3460]"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#0f3460] sm:inset-x-4" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 border-b border-neutral-100 px-4 py-3">
          <p className="text-sm text-neutral-600">{t(`tabsHelp.${tab}`)}</p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setPage(1);
                  setSearchQuery(event.target.value);
                }}
                placeholder={t("searchPlaceholder")}
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
              {t("overdueOnly")}
            </label>
          </div>
        </div>

        {authLoading || loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : empty ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-neutral-500">{t("empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/admin/disputes/${item.id}`}
                className="block px-4 py-4 transition hover:bg-neutral-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.order.orderNumber}</p>
                    <p className="mt-1 text-sm text-neutral-700">{item.orderItem.productName}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {item.customer.fullName} · {item.vendor.storeName ?? t("shopFallback")} ·{" "}
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

        {pagination && !empty ? (
          <PaginationFooter
            pageIndex={pagination.page - 1}
            pageCount={pagination.totalPages}
            pageSize={pagination.pageSize}
            onPageIndexChange={(pageIndex) => setPage(pageIndex + 1)}
            onPageSizeChange={(nextPageSize) => {
              setPage(1);
              setPageSize(nextPageSize);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
