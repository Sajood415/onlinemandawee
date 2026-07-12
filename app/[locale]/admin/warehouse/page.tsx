"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, RefreshCw } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";

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

  const [inboundStatusFilter, setInboundStatusFilter] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState("");
  const [outboundStatusFilter, setOutboundStatusFilter] = useState("");

  const [inboundData, setInboundData] = useState<PagedResponse<InboundShipment> | null>(null);
  const [batchData, setBatchData] = useState<PagedResponse<ConsolidationBatch> | null>(null);
  const [outboundData, setOutboundData] = useState<PagedResponse<OutboundShipment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

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
    return params.toString();
  }, [inboundStatusFilter]);

  const batchQuery = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (batchStatusFilter) params.set("status", batchStatusFilter);
    return params.toString();
  }, [batchStatusFilter]);

  const outboundQuery = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (outboundStatusFilter) params.set("status", outboundStatusFilter);
    return params.toString();
  }, [outboundStatusFilter]);

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
    async (key: string, path: string, body?: object) => {
      setActionLoadingKey(key);
      setError(null);
      try {
        const res = await fetchWithAuth(path, {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        await parseApiResponse(res);
        await loadAll();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errors.actionFailed"));
      } finally {
        setActionLoadingKey(null);
      }
    },
    [loadAll, t]
  );

  const inboundPagination = useClientPagination(inboundData?.items ?? [], {
    initialPageSize: 10,
    resetKey: inboundStatusFilter,
  });
  const batchPagination = useClientPagination(batchData?.items ?? [], {
    initialPageSize: 10,
    resetKey: batchStatusFilter,
  });
  const outboundPagination = useClientPagination(outboundData?.items ?? [], {
    initialPageSize: 10,
    resetKey: outboundStatusFilter,
  });

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-semibold">{t("guide.title")}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-blue-800">
          <li>{t("guide.step1")}</li>
          <li>{t("guide.step2")}</li>
          <li>{t("guide.step3")}</li>
          <li>{t("guide.step4")}</li>
        </ol>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">{t("inbound.title")}</h2>
          <div className="w-full max-w-xs">
            <label className={LABEL_CLASS}>{t("common.status")}</label>
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
          </div>
        </div>
        {loading ? (
          <div className="flex min-h-[140px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="responsive-table-shell overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-2 py-2">{t("common.order")}</th>
                  <th className="px-2 py-2">{t("common.vendor")}</th>
                  <th className="px-2 py-2">{t("common.products")}</th>
                  <th className="px-2 py-2">{t("common.qty")}</th>
                  <th className="px-2 py-2">{t("inbound.packageStatus")}</th>
                  <th className="px-2 py-2">{t("inbound.orderProgress")}</th>
                  <th className="px-2 py-2">{t("common.tracking")}</th>
                  <th className="px-2 py-2">{t("common.shipped")}</th>
                  <th className="px-2 py-2">{t("common.received")}</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {inboundPagination.paginatedItems.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100">
                    <td className="px-2 py-2 font-medium text-neutral-900">{row.order.orderNumber}</td>
                    <td className="px-2 py-2 text-neutral-700">
                      {row.vendorOrder.vendorStoreName ??
                        row.vendorOrder.vendorStoreSlug ??
                        t("common.vendor")}
                    </td>
                    <td className="px-2 py-2 text-neutral-700">
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
                    <td className="px-2 py-2 font-medium text-neutral-900">{row.totalQuantity}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.status)}`}
                      >
                        {inboundStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.consolidationBatch.status)}`}
                      >
                        {batchStatusLabel(row.consolidationBatch.status)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-neutral-700">{row.trackingRef ?? "—"}</td>
                    <td className="px-2 py-2 text-neutral-700">{displayDate(row.shippedAt)}</td>
                    <td className="px-2 py-2 text-neutral-700">{displayDate(row.receivedAt)}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        {row.status === "PENDING_SHIPMENT" ? (
                          <button
                            type="button"
                            disabled={actionLoadingKey === `${row.id}:ship`}
                            onClick={() => {
                              const trackingRef = window.prompt(
                                t("inbound.promptTracking"),
                                row.trackingRef ?? ""
                              );
                              if (trackingRef === null) return;
                              void runAction(
                                `${row.id}:ship`,
                                `/api/admin/warehouse/inbound-shipments/${row.id}/ship`,
                                { trackingRef: trackingRef.trim() || undefined }
                              );
                            }}
                            className="rounded-lg border border-cyan-300 bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-50"
                          >
                            {t("inbound.recordShip")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={row.status !== "INBOUND_SHIPPED" || actionLoadingKey === row.id}
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
                              `/api/admin/warehouse/inbound-shipments/${row.id}/receive`
                            )
                          }
                          className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                        >
                          {t("inbound.markReceived")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (inboundData?.items.length ?? 0) > 0 ? (
          <PaginationFooter
            pageIndex={inboundPagination.pageIndex}
            pageCount={inboundPagination.pageCount}
            pageSize={inboundPagination.pageSize}
            pageSizeOptions={inboundPagination.pageSizeOptions}
            onPageIndexChange={inboundPagination.setPageIndex}
            onPageSizeChange={inboundPagination.setPageSize}
          />
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">{t("consolidation.title")}</h2>
          <div className="w-full max-w-xs">
            <label className={LABEL_CLASS}>{t("common.status")}</label>
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
            </select>
          </div>
        </div>
        {loading ? (
          <div className="flex min-h-[140px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="responsive-table-shell overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-2 py-2">{t("common.order")}</th>
                  <th className="px-2 py-2">{t("consolidation.orderProgress")}</th>
                  <th className="px-2 py-2">{t("consolidation.receivedProgress")}</th>
                  <th className="px-2 py-2">{t("consolidation.readyAt")}</th>
                  <th className="px-2 py-2">{t("consolidation.customerShipment")}</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {batchPagination.paginatedItems.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100">
                    <td className="px-2 py-2 font-medium text-neutral-900">{row.order.orderNumber}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.status)}`}
                      >
                        {batchStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-neutral-700">
                      {t("consolidation.vendorProgress", {
                        received: row.receivedVendorCount,
                        expected: row.expectedVendorCount,
                      })}
                    </td>
                    <td className="px-2 py-2 text-neutral-700">{displayDate(row.readyToConsolidateAt)}</td>
                    <td className="px-2 py-2 text-neutral-700">
                      {row.outboundShipment
                        ? outboundStatusLabel(row.outboundShipment.status)
                        : t("consolidation.notCreated")}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        disabled={row.status !== "READY_TO_CONSOLIDATE" || actionLoadingKey === row.id}
                        onClick={() => {
                          const trackingRef = window.prompt(
                            t("consolidation.promptTracking"),
                            row.outboundShipment?.trackingRef ?? ""
                          );
                          if (trackingRef === null) return;
                          void runAction(row.id, `/api/admin/warehouse/batches/${row.id}/consolidate`, {
                            trackingRef: trackingRef.trim() || undefined,
                          });
                        }}
                        className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        {t("consolidation.combine")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (batchData?.items.length ?? 0) > 0 ? (
          <PaginationFooter
            pageIndex={batchPagination.pageIndex}
            pageCount={batchPagination.pageCount}
            pageSize={batchPagination.pageSize}
            pageSizeOptions={batchPagination.pageSizeOptions}
            onPageIndexChange={batchPagination.setPageIndex}
            onPageSizeChange={batchPagination.setPageSize}
          />
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">{t("outbound.title")}</h2>
          <div className="w-full max-w-xs">
            <label className={LABEL_CLASS}>{t("common.status")}</label>
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
          </div>
        </div>
        {loading ? (
          <div className="flex min-h-[140px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="responsive-table-shell overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-2 py-2">{t("common.order")}</th>
                  <th className="px-2 py-2">{t("outbound.shipmentStatus")}</th>
                  <th className="px-2 py-2">{t("outbound.orderProgress")}</th>
                  <th className="px-2 py-2">{t("common.tracking")}</th>
                  <th className="px-2 py-2">{t("outbound.packedAt")}</th>
                  <th className="px-2 py-2">{t("common.shipped")}</th>
                  <th className="px-2 py-2">{t("common.delivered")}</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {outboundPagination.paginatedItems.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100">
                    <td className="px-2 py-2 font-medium text-neutral-900">{row.order.orderNumber}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.status)}`}
                      >
                        {outboundStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-neutral-700">
                      {batchStatusLabel(row.consolidationBatch.status)}
                    </td>
                    <td className="px-2 py-2 text-neutral-700">{row.trackingRef ?? "—"}</td>
                    <td className="px-2 py-2 text-neutral-700">{displayDate(row.consolidatedAt)}</td>
                    <td className="px-2 py-2 text-neutral-700">{displayDate(row.shippedAt)}</td>
                    <td className="px-2 py-2 text-neutral-700">{displayDate(row.deliveredAt)}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={row.status !== "CONSOLIDATED" || actionLoadingKey === `${row.id}:ship`}
                          onClick={() => {
                            const trackingRef = window.prompt(
                              t("outbound.promptTracking"),
                              row.trackingRef ?? ""
                            );
                            if (trackingRef === null) return;
                            void runAction(
                              `${row.id}:ship`,
                              `/api/admin/warehouse/outbound-shipments/${row.id}/ship`,
                              {
                                trackingRef: trackingRef.trim() || undefined,
                              }
                            );
                          }}
                          className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                        >
                          {t("outbound.markShipped")}
                        </button>
                        <button
                          type="button"
                          disabled={
                            row.status !== "OUTBOUND_SHIPPED" || actionLoadingKey === `${row.id}:deliver`
                          }
                          onClick={() =>
                            void runAction(
                              `${row.id}:deliver`,
                              `/api/admin/warehouse/outbound-shipments/${row.id}/deliver`
                            )
                          }
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {t("outbound.markDelivered")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (outboundData?.items.length ?? 0) > 0 ? (
          <PaginationFooter
            pageIndex={outboundPagination.pageIndex}
            pageCount={outboundPagination.pageCount}
            pageSize={outboundPagination.pageSize}
            pageSizeOptions={outboundPagination.pageSizeOptions}
            onPageIndexChange={outboundPagination.setPageIndex}
            onPageSizeChange={outboundPagination.setPageSize}
          />
        ) : null}
      </section>
    </div>
  );
}
