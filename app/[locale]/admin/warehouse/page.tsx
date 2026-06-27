"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
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

function displayDate(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

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
      setError(e instanceof Error ? e.message : "Failed to load warehouse queues.");
    } finally {
      setLoading(false);
    }
  }, [inboundQuery, batchQuery, outboundQuery]);

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
        setError(e instanceof Error ? e.message : "Warehouse action failed.");
      } finally {
        setActionLoadingKey(null);
      }
    },
    [loadAll]
  );

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
          <h1 className="text-2xl font-bold text-[#0f3460]">Warehouse Operations</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Operate inbound receiving, consolidation, and outbound delivery workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-semibold">Standard delivery tracking flow</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-blue-800">
          <li>Each inbound row is one vendor shipment (not one unit). Qty shows total units in that shipment.</li>
          <li>Vendor ships items to the warehouse and submits tracking (Vendor Orders → Send to warehouse).</li>
          <li>Admin records inbound tracking here if the vendor has not, then marks each vendor shipment received.</li>
          <li>When all vendor shipments are received, consolidate the batch and ship outbound to the customer.</li>
        </ol>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">Inbound Queue</h2>
          <div className="w-full max-w-xs">
            <label className={LABEL_CLASS}>Status</label>
            <select
              className={INPUT_CLASS}
              value={inboundStatusFilter}
              onChange={(event) => setInboundStatusFilter(event.target.value)}
            >
              <option value="">All</option>
              <option value="PENDING_SHIPMENT">Pending Shipment</option>
              <option value="INBOUND_SHIPPED">Inbound Shipped</option>
              <option value="RECEIVED">Received</option>
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
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Vendor</th>
                  <th className="px-2 py-2">Products</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Inbound status</th>
                  <th className="px-2 py-2">Batch</th>
                  <th className="px-2 py-2">Tracking</th>
                  <th className="px-2 py-2">Shipped</th>
                  <th className="px-2 py-2">Received</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {(inboundData?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100">
                    <td className="px-2 py-2 font-medium text-neutral-900">{row.order.orderNumber}</td>
                    <td className="px-2 py-2 text-neutral-700">
                      {row.vendorOrder.vendorStoreName ?? row.vendorOrder.vendorStoreSlug ?? "Vendor"}
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
                        {row.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.consolidationBatch.status)}`}
                      >
                        {row.consolidationBatch.status}
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
                                "Inbound tracking / AWB from vendor (optional):",
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
                            Record inbound ship
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={row.status !== "INBOUND_SHIPPED" || actionLoadingKey === row.id}
                          title={
                            row.status === "PENDING_SHIPMENT"
                              ? "Waiting for vendor inbound shipment or use Record inbound ship"
                              : row.status === "RECEIVED"
                                ? "Already received"
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
                          Mark received
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">Consolidation Queue</h2>
          <div className="w-full max-w-xs">
            <label className={LABEL_CLASS}>Status</label>
            <select
              className={INPUT_CLASS}
              value={batchStatusFilter}
              onChange={(event) => setBatchStatusFilter(event.target.value)}
            >
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="READY_TO_CONSOLIDATE">Ready To Consolidate</option>
              <option value="CONSOLIDATED">Consolidated</option>
              <option value="OUTBOUND_SHIPPED">Outbound Shipped</option>
              <option value="DELIVERED">Delivered</option>
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
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Batch status</th>
                  <th className="px-2 py-2">Received progress</th>
                  <th className="px-2 py-2">Ready at</th>
                  <th className="px-2 py-2">Outbound</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {(batchData?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100">
                    <td className="px-2 py-2 font-medium text-neutral-900">{row.order.orderNumber}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-neutral-700">
                      {row.receivedVendorCount}/{row.expectedVendorCount} vendors
                    </td>
                    <td className="px-2 py-2 text-neutral-700">{displayDate(row.readyToConsolidateAt)}</td>
                    <td className="px-2 py-2 text-neutral-700">
                      {row.outboundShipment ? row.outboundShipment.status : "Not created"}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        disabled={row.status !== "READY_TO_CONSOLIDATE" || actionLoadingKey === row.id}
                        onClick={() => {
                          const trackingRef = window.prompt(
                            "Optional outbound tracking reference for consolidation:",
                            row.outboundShipment?.trackingRef ?? ""
                          );
                          void runAction(row.id, `/api/admin/warehouse/batches/${row.id}/consolidate`, {
                            trackingRef: trackingRef?.trim() || undefined,
                          });
                        }}
                        className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        Consolidate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">Outbound Queue</h2>
          <div className="w-full max-w-xs">
            <label className={LABEL_CLASS}>Status</label>
            <select
              className={INPUT_CLASS}
              value={outboundStatusFilter}
              onChange={(event) => setOutboundStatusFilter(event.target.value)}
            >
              <option value="">All</option>
              <option value="CONSOLIDATED">Consolidated</option>
              <option value="OUTBOUND_SHIPPED">Outbound Shipped</option>
              <option value="DELIVERED">Delivered</option>
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
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Batch status</th>
                  <th className="px-2 py-2">Tracking</th>
                  <th className="px-2 py-2">Consolidated</th>
                  <th className="px-2 py-2">Shipped</th>
                  <th className="px-2 py-2">Delivered</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {(outboundData?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100">
                    <td className="px-2 py-2 font-medium text-neutral-900">{row.order.orderNumber}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-neutral-700">{row.consolidationBatch.status}</td>
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
                              "Tracking reference (optional):",
                              row.trackingRef ?? ""
                            );
                            void runAction(
                              `${row.id}:ship`,
                              `/api/admin/warehouse/outbound-shipments/${row.id}/ship`,
                              {
                                trackingRef: trackingRef?.trim() || undefined,
                              }
                            );
                          }}
                          className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                        >
                          Mark shipped
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
                          Mark delivered
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
