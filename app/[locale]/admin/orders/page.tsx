"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { AdminOrderDisputePanel } from "@/components/admin/AdminOrderDisputePanel";
import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import type { OrderStatus, VendorOrderStatus } from "@/domain/order/order-status";
import { adminOrderStatusFilters } from "@/domain/order/order-status";
import type { PayoutStatus } from "@/domain/payment/payment-types";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { Link } from "@/i18n/navigation";

type VendorOption = {
  id: string;
  storeName: string | null;
  storeSlug: string | null;
};

type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  currency: string;
  grandTotalAmount: number;
  createdAt: string;
  customer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  } | null;
  guestEmail: string | null;
  shippingContact: {
    fullName: string;
    phone: string;
  };
  vendorCount: number;
  vendorFulfillmentStatuses: VendorOrderStatus[];
  vendors: Array<{
    id: string;
    vendorProfileId: string;
    vendorStoreName: string | null;
    vendorStoreSlug: string | null;
    status: VendorOrderStatus;
    grandTotalAmount: number;
    currency: string;
    commissionAmount: number | null;
    payout: {
      status: PayoutStatus | null;
      amount: number | null;
      currency: string | null;
      holdUntil: string | null;
      releasedAt: string | null;
      sentAt: string | null;
    };
    items: Array<{
      id: string;
      productName: string;
      productSku: string | null;
      quantity: number;
    }>;
  }>;
  totalCommissionAmount: number;
  itemCount: number;
  lineItemCount: number;
  itemsPreview: string[];
};

type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  currency: string;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
  customer: AdminOrderListItem["customer"];
  guestEmail: string | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
  };
  vendorOrders: Array<{
    id: string;
    vendorProfileId: string;
    vendorStoreSlug: string | null;
    vendorStoreName: string | null;
    status: VendorOrderStatus;
    deliveredAt: string | null;
    currency: string;
    subtotalAmount: number;
    deliveryAmount: number;
    discountAmount: number;
    grandTotalAmount: number;
    couponCode: string | null;
    commission: {
      rateBps: number | null;
      baseAmount: number | null;
      commissionAmount: number | null;
      currency: string | null;
    };
    payout: {
      status: PayoutStatus | null;
      amount: number | null;
      currency: string | null;
      holdUntil: string | null;
      releasedAt: string | null;
      sentAt: string | null;
    };
    vendorLedgerEntries: Array<{
      id: string;
      bucket: string;
      entryType: string;
      amount: number;
      currency: string;
      description: string | null;
      createdAt: string;
    }>;
    items: Array<{
      id: string;
      productName: string;
      productSku: string | null;
      quantity: number;
      currency: string;
      unitPriceAmount: number;
      lineTotalAmount: number;
    }>;
  }>;
  totalCommissionAmount: number;
  refundCases: Array<{
    id: string;
    orderItemId: string;
    status: string;
    reason: string;
    requestedAmount: number;
    createdAt: string;
    decision: {
      decisionType: string;
      approvedAmount: number;
      reason: string | null;
    } | null;
  }>;
  warehouse: {
    inboundShipments: Array<{
      id: string;
      orderVendorId: string;
      vendorProfileId: string;
      vendorStoreName: string | null;
      vendorStoreSlug: string | null;
      status: "PENDING_SHIPMENT" | "INBOUND_SHIPPED" | "RECEIVED";
      trackingRef: string | null;
      shippedAt: string | null;
      receivedAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    batch: {
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
      createdAt: string;
      updatedAt: string;
    } | null;
    outboundShipment: {
      id: string;
      status: "CONSOLIDATED" | "OUTBOUND_SHIPPED" | "DELIVERED";
      trackingRef: string | null;
      consolidatedAt: string | null;
      shippedAt: string | null;
      deliveredAt: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;
  };
};

type AdminOrderListResponse = {
  items: AdminOrderListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
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

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function platformStatusClass(status: string) {
  if (status === "COMPLETED" || status === "FULFILLED") return "bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700";
  if (status === "PARTIALLY_FULFILLED") return "bg-amber-50 text-amber-700";
  if (status === "PAID") return "bg-blue-50 text-blue-700";
  return "bg-neutral-100 text-neutral-700";
}

function vendorStatusClass(status: VendorOrderStatus) {
  if (status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (status === "SHIPPED") return "bg-cyan-50 text-cyan-700";
  if (status === "PREPARING") return "bg-yellow-50 text-yellow-700";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-blue-700";
}

function paymentStatusClass(status: string) {
  if (status === "PAID") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "FAILED" || status === "REFUNDED") return "bg-rose-50 text-rose-700";
  if (status === "PARTIALLY_REFUNDED") return "bg-orange-50 text-orange-700";
  return "bg-neutral-100 text-neutral-700";
}

function payoutStatusClass(status: PayoutStatus | null) {
  if (status === "SENT") return "bg-emerald-50 text-emerald-700";
  if (status === "READY") return "bg-blue-50 text-blue-700";
  if (status === "ON_HOLD") return "bg-amber-50 text-amber-700";
  if (status === "FAILED") return "bg-rose-50 text-rose-700";
  return "bg-neutral-100 text-neutral-500";
}

function payoutStatusLabel(status: PayoutStatus | null) {
  if (!status) return "Not created";
  return status.replaceAll("_", " ");
}

function warehouseStatusClass(status: string) {
  if (status === "RECEIVED" || status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (status === "READY_TO_CONSOLIDATE" || status === "CONSOLIDATED")
    return "bg-blue-50 text-blue-700";
  if (status === "INBOUND_SHIPPED" || status === "OUTBOUND_SHIPPED")
    return "bg-cyan-50 text-cyan-700";
  if (status === "PARTIALLY_RECEIVED") return "bg-amber-50 text-amber-700";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700";
  return "bg-neutral-100 text-neutral-700";
}

function buildWarehouseTimeline(detail: AdminOrderDetail) {
  const events: Array<{ label: string; at: string | null; status: string }> = [];
  if (detail.warehouse.batch) {
    events.push({
      label: "Batch created",
      at: detail.warehouse.batch.createdAt,
      status: "OPEN",
    });
    events.push({
      label: "Batch ready to consolidate",
      at: detail.warehouse.batch.readyToConsolidateAt,
      status: "READY_TO_CONSOLIDATE",
    });
  }
  if (detail.warehouse.outboundShipment) {
    events.push({
      label: "Consolidated",
      at: detail.warehouse.outboundShipment.consolidatedAt,
      status: "CONSOLIDATED",
    });
    events.push({
      label: "Outbound shipped",
      at: detail.warehouse.outboundShipment.shippedAt,
      status: "OUTBOUND_SHIPPED",
    });
    events.push({
      label: "Delivered",
      at: detail.warehouse.outboundShipment.deliveredAt,
      status: "DELIVERED",
    });
  }

  return events.filter((event) => event.at);
}

function customerLabel(order: AdminOrderListItem) {
  if (order.customer?.fullName) return order.customer.fullName;
  if (order.guestEmail) return order.guestEmail;
  return order.shippingContact.fullName;
}

function customerEmail(order: AdminOrderListItem) {
  return order.customer?.email ?? order.guestEmail ?? "—";
}

function customerPhone(order: AdminOrderListItem) {
  return order.customer?.phone ?? order.shippingContact.phone ?? "—";
}

function buildQueryString(input: {
  page: number;
  pageSize: number;
  vendorProfileId: string;
  statusFilter: string;
  from: string;
  to: string;
  search: string;
}) {
  const params = new URLSearchParams();
  params.set("page", String(input.page));
  params.set("pageSize", String(input.pageSize));
  if (input.vendorProfileId) params.set("vendorProfileId", input.vendorProfileId);
  if (input.statusFilter) params.set("statusFilter", input.statusFilter);
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  if (input.search.trim()) params.set("search", input.search.trim());
  return params.toString();
}

type AppliedFilters = {
  search: string;
  vendorProfileId: string;
  statusFilter: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: AppliedFilters = {
  search: "",
  vendorProfileId: "",
  statusFilter: "",
  from: "",
  to: "",
};

const STATUS_FILTER_LABELS: Record<(typeof adminOrderStatusFilters)[number], string> = {
  PENDING: "Pending",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default function AdminOrdersPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");

  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(EMPTY_FILTERS);

  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadVendors = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/admin/vendors");
      const data = await parseApiResponse<VendorOption[]>(res);
      setVendors(
        data
          .map((vendor) => ({
            id: vendor.id,
            storeName: vendor.storeName,
            storeSlug: vendor.storeSlug,
          }))
          .sort((a, b) => (a.storeName ?? "").localeCompare(b.storeName ?? ""))
      );
    } catch {
      setVendors([]);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryString({
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...appliedFilters,
      });
      const res = await fetchWithAuth(`/api/admin/orders?${qs}`);
      const data = await parseApiResponse<AdminOrderListResponse>(res);
      setOrders(data.items);
      setPagination(data.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, appliedFilters]);

  useEffect(() => {
    if (!authLoading && user) void loadVendors();
  }, [authLoading, user, loadVendors]);

  useEffect(() => {
    if (!authLoading && user) void loadOrders();
  }, [authLoading, user, loadOrders]);

  const openDetail = useCallback(async (orderId: string) => {
    setDetailOrderId(orderId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetchWithAuth(`/api/admin/orders/${orderId}`);
      const data = await parseApiResponse<AdminOrderDetail>(res);
      setDetail(data);
    } catch (e) {
      setDetailOrderId(null);
      setError(e instanceof Error ? e.message : "Failed to load order details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!detailOrderId) return;
    try {
      const res = await fetchWithAuth(`/api/admin/orders/${detailOrderId}`);
      const data = await parseApiResponse<AdminOrderDetail>(res);
      setDetail(data);
      setOrders((current) =>
        current.map((order) =>
          order.id === data.id ? { ...order, paymentStatus: data.paymentStatus } : order
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh order details.");
    }
  }, [detailOrderId]);

  const closeDetail = () => {
    setDetailOrderId(null);
    setDetail(null);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPagination((current) => ({ ...current, page: 1 }));
  };

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
          <h1 className="text-2xl font-bold text-[#0f3460]">Orders</h1>
          <p className="mt-1 text-sm text-neutral-600">
            All marketplace orders across every vendor. Refunds are vendor-driven; use dispute
            intervention when needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <label className={LABEL_CLASS} htmlFor="admin-order-search">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                id="admin-order-search"
                className={`${INPUT_CLASS} pl-9`}
                placeholder="Order #, email, phone, customer name"
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="admin-order-vendor">
              Vendor
            </label>
            <select
              id="admin-order-vendor"
              className={INPUT_CLASS}
              value={draftFilters.vendorProfileId}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  vendorProfileId: event.target.value,
                }))
              }
            >
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.storeName ?? vendor.storeSlug ?? vendor.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="admin-order-status-filter">
              Order status
            </label>
            <select
              id="admin-order-status-filter"
              className={INPUT_CLASS}
              value={draftFilters.statusFilter}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  statusFilter: event.target.value,
                }))
              }
            >
              <option value="">All statuses</option>
              {adminOrderStatusFilters.map((status) => (
                <option key={status} value={status}>
                  {STATUS_FILTER_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="admin-order-from">
              From date
            </label>
            <input
              id="admin-order-from"
              type="date"
              className={INPUT_CLASS}
              value={draftFilters.from}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, from: event.target.value }))
              }
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="admin-order-to">
              To date
            </label>
            <input
              id="admin-order-to"
              type="date"
              className={INPUT_CLASS}
              value={draftFilters.to}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, to: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847]"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Reset
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-14 text-center text-sm text-neutral-500">
          No orders match the current filters.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Vendors</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Transaction fee</th>
                    <th className="px-4 py-3">Payout</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-4 py-3 align-top text-sm">
                        <p className="font-semibold text-neutral-900">{order.orderNumber}</p>
                        <p className="text-xs text-neutral-500">{displayDate(order.createdAt)}</p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${platformStatusClass(order.status)}`}
                        >
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <p className="font-medium text-neutral-900">{customerLabel(order)}</p>
                        <p className="text-xs text-neutral-500">{customerEmail(order)}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <div className="space-y-2">
                          {order.vendors.map((vendor) => (
                            <div key={vendor.id}>
                              <p className="font-medium text-neutral-900">
                                {vendor.vendorStoreName ?? vendor.vendorStoreSlug ?? "Vendor"}
                              </p>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${vendorStatusClass(vendor.status)}`}
                              >
                                {vendor.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <p className="font-medium text-neutral-900">
                          {order.itemCount} unit{order.itemCount !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {order.lineItemCount} line item{order.lineItemCount !== 1 ? "s" : ""}
                        </p>
                        {order.itemsPreview.length > 0 ? (
                          <p className="mt-1 max-w-[180px] truncate text-xs text-neutral-500">
                            {order.itemsPreview.join(", ")}
                            {order.lineItemCount > order.itemsPreview.length ? "…" : ""}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(order.paymentStatus)}`}
                        >
                          {order.paymentStatus.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <p className="font-semibold text-neutral-900">
                          {order.totalCommissionAmount > 0
                            ? formatMoney(order.totalCommissionAmount, order.currency)
                            : "—"}
                        </p>
                        <p className="text-xs text-neutral-500">Per-order fee (allocated)</p>
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <div className="space-y-1">
                          {order.vendors.map((vendor) => (
                            <div key={vendor.id}>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${payoutStatusClass(vendor.payout.status)}`}
                              >
                                {payoutStatusLabel(vendor.payout.status)}
                              </span>
                              {vendor.payout.amount != null ? (
                                <p className="text-xs text-neutral-500">
                                  {formatMoney(
                                    vendor.payout.amount,
                                    vendor.payout.currency ?? vendor.currency
                                  )}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <p className="font-semibold text-neutral-900">
                          {formatMoney(order.grandTotalAmount, order.currency)}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-sm">
                        <button
                          type="button"
                          onClick={() => void openDetail(order.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutral-600">
              Showing page {pagination.page} of {pagination.totalPages} · {pagination.total}{" "}
              total orders
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pagination.pageSize}
                onChange={(event) =>
                  setPagination((current) => ({
                    ...current,
                    page: 1,
                    pageSize: Number(event.target.value),
                  }))
                }
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((current) => ({ ...current, page: current.page - 1 }))
                }
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPagination((current) => ({ ...current, page: current.page + 1 }))
                }
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {detailOrderId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Order detail
                </p>
                <h2 className="text-xl font-bold text-[#0f3460]">
                  {detail?.orderNumber ?? "Loading..."}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg border border-neutral-300 p-2 text-neutral-600 hover:bg-neutral-50"
                aria-label="Close order detail"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : (
              <div className="space-y-6 p-5">
                {(() => {
                  const timelineEvents = buildWarehouseTimeline(detail);
                  return (
                    <section className="rounded-xl border border-neutral-200 p-4">
                      <h3 className="text-sm font-semibold text-neutral-900">Warehouse workflow</h3>
                      <div className="mt-3 grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Batch status
                          </p>
                          {detail.warehouse.batch ? (
                            <>
                              <span
                                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${warehouseStatusClass(detail.warehouse.batch.status)}`}
                              >
                                {detail.warehouse.batch.status}
                              </span>
                              <p className="mt-2 text-xs text-neutral-600">
                                Received {detail.warehouse.batch.receivedVendorCount}/
                                {detail.warehouse.batch.expectedVendorCount}
                              </p>
                            </>
                          ) : (
                            <p className="mt-2 text-sm text-neutral-600">No warehouse batch</p>
                          )}
                        </div>

                        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Outbound shipment
                          </p>
                          {detail.warehouse.outboundShipment ? (
                            <>
                              <span
                                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${warehouseStatusClass(detail.warehouse.outboundShipment.status)}`}
                              >
                                {detail.warehouse.outboundShipment.status}
                              </span>
                              <p className="mt-2 text-xs text-neutral-600">
                                Tracking: {detail.warehouse.outboundShipment.trackingRef ?? "—"}
                              </p>
                            </>
                          ) : (
                            <p className="mt-2 text-sm text-neutral-600">Not created</p>
                          )}
                        </div>

                        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            Workflow timeline
                          </p>
                          {timelineEvents.length === 0 ? (
                            <p className="mt-2 text-sm text-neutral-600">No warehouse events yet</p>
                          ) : (
                            <ul className="mt-2 space-y-2 text-xs text-neutral-700">
                              {timelineEvents.map((event) => (
                                <li key={`${event.label}:${event.at}`} className="flex flex-col gap-1">
                                  <span className="font-medium text-neutral-900">{event.label}</span>
                                  <span>{displayDate(event.at)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                              <th className="px-2 py-2">Vendor split</th>
                              <th className="px-2 py-2">Inbound status</th>
                              <th className="px-2 py-2">Tracking</th>
                              <th className="px-2 py-2">Inbound shipped</th>
                              <th className="px-2 py-2">Received</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.warehouse.inboundShipments.length === 0 ? (
                              <tr>
                                <td className="px-2 py-3 text-neutral-500" colSpan={5}>
                                  No inbound shipments for this order.
                                </td>
                              </tr>
                            ) : (
                              detail.warehouse.inboundShipments.map((shipment) => (
                                <tr key={shipment.id} className="border-b border-neutral-100">
                                  <td className="px-2 py-2 text-neutral-900">
                                    {shipment.vendorStoreName ?? shipment.vendorStoreSlug ?? "Vendor"} ·{" "}
                                    <span className="text-xs text-neutral-500">{shipment.orderVendorId}</span>
                                  </td>
                                  <td className="px-2 py-2">
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${warehouseStatusClass(shipment.status)}`}
                                    >
                                      {shipment.status}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-neutral-700">{shipment.trackingRef ?? "—"}</td>
                                  <td className="px-2 py-2 text-neutral-700">{displayDate(shipment.shippedAt)}</td>
                                  <td className="px-2 py-2 text-neutral-700">
                                    {displayDate(shipment.receivedAt)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })()}

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-900">Platform status</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${platformStatusClass(detail.status)}`}
                      >
                        {detail.status.replaceAll("_", " ")}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(detail.paymentStatus)}`}
                      >
                        {detail.paymentStatus.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-neutral-600">
                      Placed {displayDate(detail.createdAt)}
                    </p>
                    <p className="text-sm text-neutral-600">
                      Updated {displayDate(detail.updatedAt)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="text-sm font-semibold text-neutral-900">Totals</h3>
                    <dl className="mt-2 space-y-1 text-sm text-neutral-700">
                      <div className="flex justify-between">
                        <dt>Subtotal</dt>
                        <dd>{formatMoney(detail.subtotalAmount, detail.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Delivery</dt>
                        <dd>{formatMoney(detail.deliveryAmount, detail.currency)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Discount</dt>
                        <dd>{formatMoney(detail.discountAmount, detail.currency)}</dd>
                      </div>
                      <div className="flex justify-between font-semibold text-neutral-900">
                        <dt>Grand total</dt>
                        <dd>{formatMoney(detail.grandTotalAmount, detail.currency)}</dd>
                      </div>
                      <div className="flex justify-between font-semibold text-neutral-900">
                        <dt>Total transaction fee</dt>
                        <dd>{formatMoney(detail.totalCommissionAmount, detail.currency)}</dd>
                      </div>
                    </dl>
                  </div>
                </section>

                <section className="rounded-xl border border-neutral-200 p-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Customer & delivery</h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="text-sm text-neutral-700">
                      <p className="font-medium text-neutral-900">
                        {detail.customer?.fullName ?? detail.shippingAddress.fullName}
                      </p>
                      <p>{detail.customer?.email ?? detail.guestEmail ?? "Guest checkout"}</p>
                      <p>{detail.customer?.phone ?? detail.shippingAddress.phone}</p>
                      {detail.guestEmail ? (
                        <p className="mt-2 text-xs text-neutral-500">
                          Guest email: {detail.guestEmail}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-sm text-neutral-700">
                      <p>{detail.shippingAddress.addressLine1}</p>
                      <p>
                        {detail.shippingAddress.city}, {detail.shippingAddress.postalCode}
                      </p>
                      <p>{detail.shippingAddress.country}</p>
                    </div>
                  </div>
                </section>

                <AdminOrderDisputePanel
                  orderId={detail.id}
                  orderNumber={detail.orderNumber}
                  paymentStatus={detail.paymentStatus}
                  currency={detail.currency}
                  refundCases={detail.refundCases}
                  onUpdated={() => void refreshDetail()}
                />

                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-neutral-900">Vendor splits</h3>
                  {detail.vendorOrders.map((vendorOrder) => (
                    <article
                      key={vendorOrder.id}
                      className="rounded-xl border border-neutral-200 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <Link
                            href={`/admin/vendors/${vendorOrder.vendorProfileId}`}
                            className="text-base font-semibold text-[#0f3460] underline"
                          >
                            {vendorOrder.vendorStoreName ??
                              vendorOrder.vendorStoreSlug ??
                              "Vendor"}
                          </Link>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${vendorStatusClass(vendorOrder.status)}`}
                            >
                              {vendorOrder.status}
                            </span>
                          </div>
                          {vendorOrder.status === "DELIVERED" || vendorOrder.deliveredAt ? (
                            <p className="mt-2 text-xs text-neutral-600">
                              Delivered{" "}
                              {vendorOrder.deliveredAt
                                ? displayDate(vendorOrder.deliveredAt)
                                : "— not recorded"}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-sm text-neutral-700">
                          <p>
                            Vendor total{" "}
                            <span className="font-semibold text-neutral-900">
                              {formatMoney(vendorOrder.grandTotalAmount, vendorOrder.currency)}
                            </span>
                          </p>
                          <p>
                            Transaction fee{" "}
                            <span className="font-semibold text-neutral-900">
                              {vendorOrder.commission.commissionAmount != null
                                ? formatMoney(
                                    vendorOrder.commission.commissionAmount,
                                    vendorOrder.commission.currency ?? vendorOrder.currency
                                  )
                                : "—"}
                            </span>
                          </p>
                          <p>
                            Vendor payout{" "}
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${payoutStatusClass(vendorOrder.payout.status)}`}
                            >
                              {payoutStatusLabel(vendorOrder.payout.status)}
                            </span>
                          </p>
                          {vendorOrder.payout.amount != null ? (
                            <p>
                              Payout amount{" "}
                              <span className="font-semibold text-neutral-900">
                                {formatMoney(
                                  vendorOrder.payout.amount,
                                  vendorOrder.payout.currency ?? vendorOrder.currency
                                )}
                              </span>
                            </p>
                          ) : null}
                          {vendorOrder.payout.holdUntil ? (
                            <p className="text-xs text-neutral-500">
                              Hold until {displayDate(vendorOrder.payout.holdUntil)}
                            </p>
                          ) : null}
                          {vendorOrder.payout.releasedAt ? (
                            <p className="text-xs text-neutral-500">
                              Released {displayDate(vendorOrder.payout.releasedAt)}
                            </p>
                          ) : null}
                          {vendorOrder.payout.sentAt ? (
                            <p className="text-xs text-neutral-500">
                              Sent {displayDate(vendorOrder.payout.sentAt)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                              <th className="px-2 py-2">Item</th>
                              <th className="px-2 py-2">Qty</th>
                              <th className="px-2 py-2">Unit</th>
                              <th className="px-2 py-2">Line total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorOrder.items.map((item) => (
                              <tr key={item.id} className="border-b border-neutral-100">
                                <td className="px-2 py-2 text-neutral-900">
                                  {item.productName}
                                  {item.productSku ? (
                                    <span className="block text-xs text-neutral-500">
                                      SKU {item.productSku}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-2 py-2">{item.quantity}</td>
                                <td className="px-2 py-2">
                                  {formatMoney(item.unitPriceAmount, item.currency)}
                                </td>
                                <td className="px-2 py-2">
                                  {formatMoney(item.lineTotalAmount, item.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[680px] border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                              <th className="px-2 py-2">Ledger bucket</th>
                              <th className="px-2 py-2">Entry type</th>
                              <th className="px-2 py-2">Amount</th>
                              <th className="px-2 py-2">Timestamp</th>
                              <th className="px-2 py-2">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorOrder.vendorLedgerEntries.length === 0 ? (
                              <tr>
                                <td className="px-2 py-3 text-neutral-500" colSpan={5}>
                                  No vendor ledger entries for this vendor split.
                                </td>
                              </tr>
                            ) : (
                              vendorOrder.vendorLedgerEntries.map((entry) => (
                                <tr key={entry.id} className="border-b border-neutral-100">
                                  <td className="px-2 py-2">{entry.bucket}</td>
                                  <td className="px-2 py-2">{entry.entryType}</td>
                                  <td className="px-2 py-2">
                                    {formatMoney(entry.amount, entry.currency)}
                                  </td>
                                  <td className="px-2 py-2">{displayDate(entry.createdAt)}</td>
                                  <td className="px-2 py-2 text-neutral-600">
                                    {entry.description ?? "—"}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  ))}
                </section>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
