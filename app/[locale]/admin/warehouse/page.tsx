"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, RefreshCw, X } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type PagedResponse<T> = {
  items: T[];
  pagination: Pagination;
};

type InboundShipment = {
  id: string;
  status: "PENDING_SHIPMENT" | "INBOUND_SHIPPED" | "RECEIVED";
  trackingRef: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  updatedAt: string;
  totalQuantity: number;
  products: Array<{
    productName: string;
    quantity: number;
  }>;
  order: { id: string; orderNumber: string };
  vendorOrder: {
    id: string;
    status: string;
    vendorStoreName: string | null;
    vendorStoreSlug: string | null;
  };
  consolidationBatch: { id: string; status: string };
};

type ConsolidationBatch = {
  id: string;
  status:
    | "OPEN"
    | "PARTIALLY_RECEIVED"
    | "READY_TO_CONSOLIDATE"
    | "CONSOLIDATED"
    | "OUTBOUND_SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
  expectedVendorCount: number;
  receivedVendorCount: number;
  readyToConsolidateAt: string | null;
  updatedAt: string;
  order: { id: string; orderNumber: string };
  outboundShipment: { id: string; status: string; trackingRef: string | null } | null;
};

type OutboundShipment = {
  id: string;
  status: "CONSOLIDATED" | "OUTBOUND_SHIPPED" | "DELIVERED";
  trackingRef: string | null;
  consolidatedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
  order: { id: string; orderNumber: string };
  consolidationBatch: { id: string; status: string };
};

type WarehouseTab = "incoming" | "pack" | "toCustomer";

type TrackingPrompt = {
  key: string;
  path: string;
  title: string;
  body: string;
  initialTracking: string;
  successToast: string;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const LABEL_CLASS = "mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500";

function badgeClass(status: string) {
  if (status === "RECEIVED" || status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (status === "READY_TO_CONSOLIDATE" || status === "CONSOLIDATED")
    return "bg-blue-50 text-blue-700";
  if (status === "OUTBOUND_SHIPPED" || status === "INBOUND_SHIPPED")
    return "bg-cyan-50 text-cyan-700";
  if (status === "PARTIALLY_RECEIVED") return "bg-amber-50 text-amber-700";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700";
  return "bg-neutral-100 text-neutral-700";
}

export default function AdminWarehousePage() {
  const locale = useLocale();
  const t = useTranslations("AdminPages.warehouse");
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");

  const [tab, setTab] = useState<WarehouseTab>("incoming");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [inboundStatusFilter, setInboundStatusFilter] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState("");
  const [outboundStatusFilter, setOutboundStatusFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [inboundData, setInboundData] = useState<PagedResponse<InboundShipment> | null>(null);
  const [batchData, setBatchData] = useState<PagedResponse<ConsolidationBatch> | null>(null);
  const [outboundData, setOutboundData] = useState<PagedResponse<OutboundShipment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [trackingPrompt, setTrackingPrompt] = useState<TrackingPrompt | null>(null);
  const [trackingValue, setTrackingValue] = useState("");

  const displayDate = useCallback(
    (iso: string | null) => {
      if (!iso) return "—";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleString(locale);
    },
    [locale]
  );

  const inboundStatusLabel = useCallback(
    (status: InboundShipment["status"]) =>
      t.has(`statuses.inbound.${status}`) ? t(`statuses.inbound.${status}`) : status,
    [t]
  );

  const batchStatusLabel = useCallback(
    (status: string) =>
      t.has(`statuses.batch.${status}`) ? t(`statuses.batch.${status}`) : status,
    [t]
  );

  const outboundStatusLabel = useCallback(
    (status: string) =>
      t.has(`statuses.outbound.${status}`) ? t(`statuses.outbound.${status}`) : status,
    [t]
  );

  const inboundQuery = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (inboundStatusFilter) params.set("status", inboundStatusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    return params.toString();
  }, [inboundStatusFilter, debouncedSearch]);

  const batchQuery = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (batchStatusFilter) params.set("status", batchStatusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    return params.toString();
  }, [batchStatusFilter, debouncedSearch]);

  const outboundQuery = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (outboundStatusFilter) params.set("status", outboundStatusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    return params.toString();
  }, [outboundStatusFilter, debouncedSearch]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inboundRes, batchRes, outboundRes] = await Promise.all([
        fetchWithAuth(`/api/admin/warehouse/inbound-shipments?${inboundQuery}`),
        fetchWithAuth(`/api/admin/warehouse/batches?${batchQuery}`),
        fetchWithAuth(`/api/admin/warehouse/outbound-shipments?${outboundQuery}`),
      ]);

      const [inboundParsed, batchParsed, outboundParsed] = await Promise.all([
        parseApiResponse<PagedResponse<InboundShipment>>(inboundRes),
        parseApiResponse<PagedResponse<ConsolidationBatch>>(batchRes),
        parseApiResponse<PagedResponse<OutboundShipment>>(outboundRes),
      ]);

      setInboundData(inboundParsed);
      setBatchData(batchParsed);
      setOutboundData(outboundParsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [batchQuery, inboundQuery, outboundQuery, t]);

  useEffect(() => {
    if (authLoading || !user) return;
    const timer = setTimeout(() => {
      void loadAll();
    }, 0);
    return () => clearTimeout(timer);
  }, [authLoading, user, loadAll]);

  const runAction = useCallback(
    async (key: string, path: string, body?: object, successToast?: string) => {
      setActionLoadingKey(key);
      setError(null);
      try {
        const res = await fetchWithAuth(path, {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        await parseApiResponse(res);
        if (successToast) toast.success(successToast);
        setTrackingPrompt(null);
        setTrackingValue("");
        await loadAll();
      } catch (e) {
        const message = e instanceof Error ? e.message : t("errors.actionFailed");
        setError(message);
        toast.error(t("errors.actionFailed"), message);
      } finally {
        setActionLoadingKey(null);
      }
    },
    [loadAll, t]
  );

  const openTrackingPrompt = useCallback((prompt: TrackingPrompt) => {
    setTrackingPrompt(prompt);
    setTrackingValue(prompt.initialTracking);
  }, []);

  const submitTrackingPrompt = useCallback(() => {
    if (!trackingPrompt) return;
    void runAction(
      trackingPrompt.key,
      trackingPrompt.path,
      { trackingRef: trackingValue.trim() || undefined },
      trackingPrompt.successToast
    );
  }, [runAction, trackingPrompt, trackingValue]);

  const inboundPagination = useClientPagination(inboundData?.items ?? [], {
    initialPageSize: 10,
    resetKey: `${inboundStatusFilter}|${debouncedSearch}`,
  });
  const batchPagination = useClientPagination(batchData?.items ?? [], {
    initialPageSize: 10,
    resetKey: `${batchStatusFilter}|${debouncedSearch}`,
  });
  const outboundPagination = useClientPagination(outboundData?.items ?? [], {
    initialPageSize: 10,
    resetKey: `${outboundStatusFilter}|${debouncedSearch}`,
  });

  const tabCounts = useMemo(
    () => ({
      incoming: inboundData?.pagination.total ?? inboundData?.items.length ?? 0,
      pack: batchData?.pagination.total ?? batchData?.items.length ?? 0,
      toCustomer: outboundData?.pagination.total ?? outboundData?.items.length ?? 0,
    }),
    [batchData, inboundData, outboundData]
  );

  const tabs: Array<{ id: WarehouseTab; label: string; count: number }> = [
    { id: "incoming", label: t("tabs.incoming"), count: tabCounts.incoming },
    { id: "pack", label: t("tabs.pack"), count: tabCounts.pack },
    { id: "toCustomer", label: t("tabs.toCustomer"), count: tabCounts.toCustomer },
  ];

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <div className="w-full sm:w-72">
            <label className={LABEL_CLASS} htmlFor="warehouse-search">
              {t("search")}
            </label>
            <input
              id="warehouse-search"
              className={INPUT_CLASS}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

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
                onClick={() => setTab(item.id)}
                className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition sm:px-6 ${
                  active
                    ? "text-[#0f3460]"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                }`}
              >
                {item.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active
                      ? "bg-[#0f3460]/10 text-[#0f3460]"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {item.count}
                </span>
                {active ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#0f3460] sm:inset-x-4" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-600">{t(`tabsHelp.${tab}`)}</p>
          <div className="w-full sm:max-w-xs">
            <label className={LABEL_CLASS}>{t("common.status")}</label>
            {tab === "incoming" ? (
              <select
                className={INPUT_CLASS}
                value={inboundStatusFilter}
                onChange={(event) => setInboundStatusFilter(event.target.value)}
              >
                <option value="">{t("common.all")}</option>
                <option value="PENDING_SHIPMENT">{inboundStatusLabel("PENDING_SHIPMENT")}</option>
                <option value="INBOUND_SHIPPED">{inboundStatusLabel("INBOUND_SHIPPED")}</option>
                <option value="RECEIVED">{inboundStatusLabel("RECEIVED")}</option>
              </select>
            ) : null}
            {tab === "pack" ? (
              <select
                className={INPUT_CLASS}
                value={batchStatusFilter}
                onChange={(event) => setBatchStatusFilter(event.target.value)}
              >
                <option value="">{t("common.all")}</option>
                <option value="OPEN">{batchStatusLabel("OPEN")}</option>
                <option value="PARTIALLY_RECEIVED">{batchStatusLabel("PARTIALLY_RECEIVED")}</option>
                <option value="READY_TO_CONSOLIDATE">
                  {batchStatusLabel("READY_TO_CONSOLIDATE")}
                </option>
                <option value="CONSOLIDATED">{batchStatusLabel("CONSOLIDATED")}</option>
                <option value="OUTBOUND_SHIPPED">{batchStatusLabel("OUTBOUND_SHIPPED")}</option>
                <option value="DELIVERED">{batchStatusLabel("DELIVERED")}</option>
                <option value="CANCELLED">{batchStatusLabel("CANCELLED")}</option>
              </select>
            ) : null}
            {tab === "toCustomer" ? (
              <select
                className={INPUT_CLASS}
                value={outboundStatusFilter}
                onChange={(event) => setOutboundStatusFilter(event.target.value)}
              >
                <option value="">{t("common.all")}</option>
                <option value="CONSOLIDATED">{outboundStatusLabel("CONSOLIDATED")}</option>
                <option value="OUTBOUND_SHIPPED">{outboundStatusLabel("OUTBOUND_SHIPPED")}</option>
                <option value="DELIVERED">{outboundStatusLabel("DELIVERED")}</option>
              </select>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            {tab === "incoming" ? (
              <div className="responsive-table-shell overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-neutral-50">
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                      <th className="px-4 py-2">{t("common.order")}</th>
                      <th className="px-4 py-2">{t("common.shop")}</th>
                      <th className="px-4 py-2">{t("common.products")}</th>
                      <th className="px-4 py-2">{t("common.quantity")}</th>
                      <th className="px-4 py-2">{t("inbound.packageStatus")}</th>
                      <th className="px-4 py-2">{t("common.tracking")}</th>
                      <th className="px-4 py-2">{t("common.shipped")}</th>
                      <th className="px-4 py-2">{t("common.received")}</th>
                      <th className="px-4 py-2">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inboundData?.items.length ?? 0) === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-neutral-500" colSpan={9}>
                          {t("empty.incoming")}
                        </td>
                      </tr>
                    ) : (
                      inboundPagination.paginatedItems.map((row) => {
                        const shopName =
                          row.vendorOrder.vendorStoreName ??
                          row.vendorOrder.vendorStoreSlug ??
                          t("common.shop");
                        return (
                          <tr key={row.id} className="border-b border-neutral-100">
                            <td className="px-4 py-3 font-medium text-neutral-900">
                              {row.order.orderNumber}
                            </td>
                            <td className="px-4 py-3 text-neutral-700">{shopName}</td>
                            <td className="px-4 py-3 text-neutral-700">
                              {row.products.length === 0 ? (
                                "—"
                              ) : (
                                <ul className="space-y-1">
                                  {row.products.map((product) => (
                                    <li key={product.productName}>{product.productName}</li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-neutral-900">
                              {row.totalQuantity}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.status)}`}
                              >
                                {inboundStatusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {row.trackingRef ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {displayDate(row.shippedAt)}
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {displayDate(row.receivedAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {row.status === "PENDING_SHIPMENT" ? (
                                  <button
                                    type="button"
                                    disabled={actionLoadingKey === `${row.id}:ship`}
                                    onClick={() =>
                                      openTrackingPrompt({
                                        key: `${row.id}:ship`,
                                        path: `/api/admin/warehouse/inbound-shipments/${row.id}/ship`,
                                        title: t("trackingModal.shopShipTitle"),
                                        body: t("trackingModal.shopShipBody", {
                                          shop: shopName,
                                          order: row.order.orderNumber,
                                        }),
                                        initialTracking: row.trackingRef ?? "",
                                        successToast: t("toasts.shopShipped"),
                                      })
                                    }
                                    className="rounded-lg border border-cyan-300 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-50"
                                  >
                                    {t("inbound.recordShip")}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={
                                    row.status !== "INBOUND_SHIPPED" ||
                                    actionLoadingKey === row.id
                                  }
                                  title={
                                    row.status === "PENDING_SHIPMENT"
                                      ? t("inbound.waitingForShip")
                                      : row.status === "RECEIVED"
                                        ? t("inbound.alreadyReceived")
                                        : undefined
                                  }
                                  onClick={() =>
                                    void runAction(
                                      row.id,
                                      `/api/admin/warehouse/inbound-shipments/${row.id}/receive`,
                                      undefined,
                                      t("toasts.received")
                                    )
                                  }
                                  className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                                >
                                  {actionLoadingKey === row.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    t("inbound.markReceived")
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {tab === "pack" ? (
              <div className="responsive-table-shell overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-sm">
                  <thead className="bg-neutral-50">
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                      <th className="px-4 py-2">{t("common.order")}</th>
                      <th className="px-4 py-2">{t("common.status")}</th>
                      <th className="px-4 py-2">{t("pack.receivedProgress")}</th>
                      <th className="px-4 py-2">{t("pack.readySince")}</th>
                      <th className="px-4 py-2">{t("pack.customerShipment")}</th>
                      <th className="px-4 py-2">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(batchData?.items.length ?? 0) === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-neutral-500" colSpan={6}>
                          {t("empty.pack")}
                        </td>
                      </tr>
                    ) : (
                      batchPagination.paginatedItems.map((row) => {
                        const canPack = row.status === "READY_TO_CONSOLIDATE";
                        const packDisabledReason =
                          row.status === "CONSOLIDATED" ||
                          row.status === "OUTBOUND_SHIPPED" ||
                          row.status === "DELIVERED"
                            ? t("pack.alreadyPacked")
                            : row.status === "CANCELLED"
                              ? t("pack.cancelled")
                              : t("pack.waitingPackages");
                        return (
                          <tr key={row.id} className="border-b border-neutral-100">
                            <td className="px-4 py-3 font-medium text-neutral-900">
                              {row.order.orderNumber}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.status)}`}
                              >
                                {batchStatusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {t("pack.shopProgress", {
                                received: row.receivedVendorCount,
                                expected: row.expectedVendorCount,
                              })}
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {displayDate(row.readyToConsolidateAt)}
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {row.outboundShipment
                                ? outboundStatusLabel(row.outboundShipment.status)
                                : t("pack.notCreated")}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                disabled={!canPack || actionLoadingKey === row.id}
                                title={canPack ? undefined : packDisabledReason}
                                onClick={() =>
                                  openTrackingPrompt({
                                    key: row.id,
                                    path: `/api/admin/warehouse/batches/${row.id}/consolidate`,
                                    title: t("trackingModal.packTitle"),
                                    body: t("trackingModal.packBody", {
                                      order: row.order.orderNumber,
                                    }),
                                    initialTracking: row.outboundShipment?.trackingRef ?? "",
                                    successToast: t("toasts.packed"),
                                  })
                                }
                                className="rounded-lg bg-[#0f3460] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0a2847] disabled:opacity-50"
                              >
                                {actionLoadingKey === row.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  t("pack.combine")
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {tab === "toCustomer" ? (
              <div className="responsive-table-shell overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-neutral-50">
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                      <th className="px-4 py-2">{t("common.order")}</th>
                      <th className="px-4 py-2">{t("toCustomer.shipmentStatus")}</th>
                      <th className="px-4 py-2">{t("common.tracking")}</th>
                      <th className="px-4 py-2">{t("toCustomer.packedAt")}</th>
                      <th className="px-4 py-2">{t("common.shipped")}</th>
                      <th className="px-4 py-2">{t("common.delivered")}</th>
                      <th className="px-4 py-2">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(outboundData?.items.length ?? 0) === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-neutral-500" colSpan={7}>
                          {t("empty.toCustomer")}
                        </td>
                      </tr>
                    ) : (
                      outboundPagination.paginatedItems.map((row) => {
                        const canShip = row.status === "CONSOLIDATED";
                        const canDeliver = row.status === "OUTBOUND_SHIPPED";
                        return (
                          <tr key={row.id} className="border-b border-neutral-100">
                            <td className="px-4 py-3 font-medium text-neutral-900">
                              {row.order.orderNumber}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.status)}`}
                              >
                                {outboundStatusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {row.trackingRef ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {displayDate(row.consolidatedAt)}
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {displayDate(row.shippedAt)}
                            </td>
                            <td className="px-4 py-3 text-neutral-700">
                              {displayDate(row.deliveredAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    !canShip || actionLoadingKey === `${row.id}:ship`
                                  }
                                  title={
                                    canShip
                                      ? undefined
                                      : row.status === "DELIVERED"
                                        ? t("toCustomer.alreadyDelivered")
                                        : t("toCustomer.alreadyShipped")
                                  }
                                  onClick={() =>
                                    openTrackingPrompt({
                                      key: `${row.id}:ship`,
                                      path: `/api/admin/warehouse/outbound-shipments/${row.id}/ship`,
                                      title: t("trackingModal.sendTitle"),
                                      body: t("trackingModal.sendBody", {
                                        order: row.order.orderNumber,
                                      }),
                                      initialTracking: row.trackingRef ?? "",
                                      successToast: t("toasts.sent"),
                                    })
                                  }
                                  className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                                >
                                  {actionLoadingKey === `${row.id}:ship` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    t("toCustomer.markShipped")
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    !canDeliver ||
                                    actionLoadingKey === `${row.id}:deliver`
                                  }
                                  title={
                                    canDeliver
                                      ? undefined
                                      : row.status === "DELIVERED"
                                        ? t("toCustomer.alreadyDelivered")
                                        : t("toCustomer.needShipFirst")
                                  }
                                  onClick={() =>
                                    void runAction(
                                      `${row.id}:deliver`,
                                      `/api/admin/warehouse/outbound-shipments/${row.id}/deliver`,
                                      undefined,
                                      t("toasts.delivered")
                                    )
                                  }
                                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  {actionLoadingKey === `${row.id}:deliver` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    t("toCustomer.markDelivered")
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {tab === "incoming" && (inboundData?.items.length ?? 0) > 0 ? (
              <PaginationFooter
                pageIndex={inboundPagination.pageIndex}
                pageCount={inboundPagination.pageCount}
                pageSize={inboundPagination.pageSize}
                pageSizeOptions={inboundPagination.pageSizeOptions}
                onPageIndexChange={inboundPagination.setPageIndex}
                onPageSizeChange={inboundPagination.setPageSize}
              />
            ) : null}
            {tab === "pack" && (batchData?.items.length ?? 0) > 0 ? (
              <PaginationFooter
                pageIndex={batchPagination.pageIndex}
                pageCount={batchPagination.pageCount}
                pageSize={batchPagination.pageSize}
                pageSizeOptions={batchPagination.pageSizeOptions}
                onPageIndexChange={batchPagination.setPageIndex}
                onPageSizeChange={batchPagination.setPageSize}
              />
            ) : null}
            {tab === "toCustomer" && (outboundData?.items.length ?? 0) > 0 ? (
              <PaginationFooter
                pageIndex={outboundPagination.pageIndex}
                pageCount={outboundPagination.pageCount}
                pageSize={outboundPagination.pageSize}
                pageSizeOptions={outboundPagination.pageSizeOptions}
                onPageIndexChange={outboundPagination.setPageIndex}
                onPageSizeChange={outboundPagination.setPageSize}
              />
            ) : null}
          </>
        )}
      </div>

      {trackingPrompt ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoadingKey) {
              setTrackingPrompt(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-tracking-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="warehouse-tracking-title"
                  className="text-lg font-semibold text-neutral-900"
                >
                  {trackingPrompt.title}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">{trackingPrompt.body}</p>
              </div>
              <button
                type="button"
                disabled={Boolean(actionLoadingKey)}
                onClick={() => setTrackingPrompt(null)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-60"
                aria-label={t("trackingModal.cancel")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <label className={LABEL_CLASS} htmlFor="warehouse-tracking-input">
                {t("trackingModal.trackingLabel")}
              </label>
              <input
                id="warehouse-tracking-input"
                className={INPUT_CLASS}
                value={trackingValue}
                onChange={(event) => setTrackingValue(event.target.value)}
                placeholder={t("trackingModal.trackingPlaceholder")}
                autoFocus
              />
              <p className="mt-1.5 text-xs text-neutral-500">{t("trackingModal.optionalHint")}</p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(actionLoadingKey)}
                onClick={() => setTrackingPrompt(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {t("trackingModal.cancel")}
              </button>
              <button
                type="button"
                disabled={Boolean(actionLoadingKey)}
                onClick={submitTrackingPrompt}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
              >
                {actionLoadingKey === trackingPrompt.key ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("trackingModal.saving")}
                  </>
                ) : (
                  t("trackingModal.confirm")
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
