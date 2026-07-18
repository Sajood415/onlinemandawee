"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminOrderDisputePanel } from "@/components/admin/AdminOrderDisputePanel";
import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import type { OrderStatus, VendorOrderStatus } from "@/domain/order/order-status";
import { adminOrderStatusFilters } from "@/domain/order/order-status";
import type { PayoutStatus } from "@/domain/payment/payment-types";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { resolveVendorOrderDeliveredAtIso } from "@/lib/orders/resolve-vendor-order-delivered-at";
import { Link } from "@/i18n/navigation";

type OrdersT = ReturnType<typeof useTranslations<"AdminPages.orders">>;

type VendorOption = {
  id: string;
  storeName: string | null;
  storeSlug: string | null;
};

type DeliveryMethod = "PICKUP" | "EXPRESS" | "STANDARD";

type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  deliveryMethod: DeliveryMethod | null;
  vendorDeliveryMethods: DeliveryMethod[];
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
    deliveredAt: string | null;
    grandTotalAmount: number;
    currency: string;
    commissionAmount: number | null;
    payout: {
      status: PayoutStatus | null;
      amount: number | null;
      currency: string | null;
      holdUntil: string | null;
      holdLabel: string | null;
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
  deliveryMethod: DeliveryMethod | null;
  currency: string;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  stripePaymentIntentId: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledByRole: string | null;
  isLockedByCustomerCancellation: boolean;
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
    deliveryMethod: DeliveryMethod | null;
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
      holdLabel: string | null;
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
      variantName?: string | null;
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
      totalQuantity: number;
      products: Array<{
        productName: string;
        quantity: number;
      }>;
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

function displayShortDate(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function deliveryMethodLabel(method: DeliveryMethod | null | undefined, t: OrdersT) {
  if (method === "PICKUP") return t("delivery.PICKUP");
  if (method === "EXPRESS") return t("delivery.EXPRESS");
  if (method === "STANDARD") return t("delivery.STANDARD");
  return "—";
}

function listDeliveryLabel(order: AdminOrderListItem, t: OrdersT) {
  if (order.deliveryMethod) return deliveryMethodLabel(order.deliveryMethod, t);
  if (order.vendorDeliveryMethods.length === 1) {
    return deliveryMethodLabel(order.vendorDeliveryMethods[0], t);
  }
  if (order.vendorDeliveryMethods.length > 1) return t("delivery.MIXED");
  return "—";
}

function listVendorLabel(order: AdminOrderListItem, t: OrdersT) {
  const first = order.vendors[0];
  const name =
    first?.vendorStoreName ??
    first?.vendorStoreSlug ??
    (order.vendorCount ? t("vendorFallback") : "—");
  if (order.vendorCount <= 1) return name;
  return `${name} +${order.vendorCount - 1}`;
}

function listPayoutSummary(order: AdminOrderListItem) {
  const statuses = order.vendors.map((vendor) => vendor.payout.status);
  if (statuses.every((status) => status === "SENT")) return "SENT" as const;
  if (statuses.some((status) => status === "FAILED")) return "FAILED" as const;
  if (statuses.some((status) => status === "ON_HOLD" || status == null)) {
    return "ON_HOLD" as const;
  }
  if (statuses.some((status) => status === "READY")) return "READY" as const;
  return statuses[0] ?? null;
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

function payoutStatusLabel(status: PayoutStatus | null, t: OrdersT) {
  if (!status) return t("notCreated");
  if (status === "ON_HOLD") return t("payoutStatuses.ON_HOLD");
  if (status === "READY") return t("payoutStatuses.READY");
  if (status === "SENT") return t("payoutStatuses.SENT");
  return t("payoutStatuses.FAILED");
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

function customerLabel(order: AdminOrderListItem) {
  if (order.customer?.fullName) return order.customer.fullName;
  if (order.guestEmail) return order.guestEmail;
  return order.shippingContact.fullName;
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

export default function AdminOrdersPage() {
  const t = useTranslations("AdminPages.orders");
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
      setError(e instanceof Error ? e.message : t("loadError"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, appliedFilters, t]);

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
      setError(e instanceof Error ? e.message : t("detailLoadError"));
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

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
      setError(e instanceof Error ? e.message : t("refreshDetailError"));
    }
  }, [detailOrderId, t]);

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
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </button>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <label className={LABEL_CLASS} htmlFor="admin-order-search">
              {t("search")}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                id="admin-order-search"
                className={`${INPUT_CLASS} pl-9`}
                placeholder={t("searchPlaceholder")}
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="admin-order-vendor">
              {t("vendor")}
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
              <option value="">{t("allVendors")}</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.storeName ?? vendor.storeSlug ?? vendor.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="admin-order-status-filter">
              {t("orderStatus")}
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
              <option value="">{t("allStatuses")}</option>
              {adminOrderStatusFilters.map((status) => (
                <option key={status} value={status}>
                  {t(`statusFilters.${status}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="admin-order-from">
              {t("fromDate")}
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
              {t("toDate")}
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
            {t("applyFilters")}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            {t("reset")}
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
          {t("empty")}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="responsive-table-shell overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-start text-xs font-semibold text-neutral-500">
                    <th className="px-4 py-3">{t("columns.order")}</th>
                    <th className="px-4 py-3">{t("columns.customer")}</th>
                    <th className="px-4 py-3">{t("columns.vendor")}</th>
                    <th className="px-4 py-3">{t("columns.delivery")}</th>
                    <th className="px-4 py-3">{t("columns.payment")}</th>
                    <th className="px-4 py-3">{t("columns.fee")}</th>
                    <th className="px-4 py-3">{t("columns.payout")}</th>
                    <th className="px-4 py-3">{t("columns.total")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const payoutStatus = listPayoutSummary(order);
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-neutral-100 hover:bg-neutral-50/80"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-neutral-900">
                              {order.orderNumber}
                            </p>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${platformStatusClass(order.status)}`}
                            >
                              {order.status.replaceAll("_", " ")}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {displayShortDate(order.createdAt)}
                          </p>
                        </td>
                        <td className="max-w-[160px] px-4 py-3 text-sm">
                          <p className="truncate font-medium text-neutral-900">
                            {customerLabel(order)}
                          </p>
                        </td>
                        <td className="max-w-[160px] px-4 py-3 text-sm">
                          <p className="truncate font-medium text-neutral-900">
                            {listVendorLabel(order, t)}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {order.itemCount === 1
                              ? t("item", { count: order.itemCount })
                              : t("items", { count: order.itemCount })}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-neutral-700">
                          {listDeliveryLabel(order, t)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(order.paymentStatus)}`}
                          >
                            {order.paymentStatus.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-neutral-900">
                          {order.totalCommissionAmount > 0
                            ? formatMoney(order.totalCommissionAmount, order.currency)
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${payoutStatusClass(payoutStatus)}`}
                          >
                            {payoutStatusLabel(payoutStatus, t)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-neutral-900">
                          {formatMoney(order.grandTotalAmount, order.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            type="button"
                            onClick={() => void openDetail(order.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {t("view")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              pageIndex={pagination.page - 1}
              pageCount={pagination.totalPages}
              pageSize={pagination.pageSize}
              onPageIndexChange={(pageIndex) =>
                setPagination((current) => ({ ...current, page: pageIndex + 1 }))
              }
              onPageSizeChange={(nextPageSize) =>
                setPagination((current) => ({
                  ...current,
                  page: 1,
                  pageSize: nextPageSize,
                }))
              }
            />
          </div>
        </>
      )}

      {detailOrderId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("detail.title")}
                </p>
                <h2 className="truncate text-xl font-bold text-neutral-900">
                  {detail?.orderNumber ?? "…"}
                </h2>
                {detail ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
                    <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                      {deliveryMethodLabel(
                        detail.deliveryMethod ??
                          detail.vendorOrders[0]?.deliveryMethod ??
                          null,
                        t
                      )}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {displayShortDate(detail.createdAt)}
                    </span>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50"
                aria-label={t("detail.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : (
              <div className="space-y-5 overflow-y-auto p-5">
                {detail.isLockedByCustomerCancellation ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <p className="font-semibold">{t("detail.cancelledByCustomer")}</p>
                    {detail.cancelledAt ? (
                      <p className="mt-1">
                        {t("detail.cancelledOn", {
                          date: displayShortDate(detail.cancelledAt),
                        })}
                      </p>
                    ) : null}
                    {detail.cancellationReason ? (
                      <p className="mt-1">
                        {t("detail.cancellationReason", {
                          reason: detail.cancellationReason,
                        })}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <section className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-neutral-200 p-4">
                    <h3 className="text-sm font-semibold text-neutral-900">{t("detail.totals")}</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3 text-neutral-600">
                        <dt>{t("detail.subtotal")}</dt>
                        <dd>{formatMoney(detail.subtotalAmount, detail.currency)}</dd>
                      </div>
                      <div className="flex justify-between gap-3 text-neutral-600">
                        <dt>{t("detail.delivery")}</dt>
                        <dd>{formatMoney(detail.deliveryAmount, detail.currency)}</dd>
                      </div>
                      {detail.discountAmount > 0 ? (
                        <div className="flex justify-between gap-3 text-neutral-600">
                          <dt>{t("detail.discount")}</dt>
                          <dd>{formatMoney(detail.discountAmount, detail.currency)}</dd>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-3 border-t border-neutral-100 pt-2 font-semibold text-neutral-900">
                        <dt>{t("detail.total")}</dt>
                        <dd>{formatMoney(detail.grandTotalAmount, detail.currency)}</dd>
                      </div>
                      <div className="flex justify-between gap-3 text-neutral-600">
                        <dt>{t("detail.fee")}</dt>
                        <dd>{formatMoney(detail.totalCommissionAmount, detail.currency)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-neutral-200 p-4">
                    <h3 className="text-sm font-semibold text-neutral-900">{t("detail.customer")}</h3>
                    <div className="mt-3 space-y-1 text-sm text-neutral-700">
                      <p className="font-medium text-neutral-900">
                        {detail.customer?.fullName ?? detail.shippingAddress.fullName}
                      </p>
                      <p>
                        {detail.customer?.email ?? detail.guestEmail ?? t("detail.guest")}
                      </p>
                      <p>{detail.customer?.phone ?? detail.shippingAddress.phone}</p>
                    </div>
                    {(detail.deliveryMethod ?? detail.vendorOrders[0]?.deliveryMethod) !==
                    "PICKUP" ? (
                      <div className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-700">
                        <p className="text-xs font-medium text-neutral-500">{t("detail.shipTo")}</p>
                        <p className="mt-1">{detail.shippingAddress.addressLine1}</p>
                        <p>
                          {detail.shippingAddress.city}
                          {detail.shippingAddress.postalCode
                            ? `, ${detail.shippingAddress.postalCode}`
                            : ""}
                        </p>
                        <p>{detail.shippingAddress.country}</p>
                      </div>
                    ) : (
                      <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
                        {t("detail.pickupNote")}
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-900">{t("detail.vendors")}</h3>
                  {detail.vendorOrders.map((vendorOrder) => {
                    const deliveredAt = resolveVendorOrderDeliveredAtIso({
                      status: vendorOrder.status,
                      deliveredAt: vendorOrder.deliveredAt,
                      outboundDeliveredAt: detail.warehouse.outboundShipment?.deliveredAt,
                    });
                    return (
                      <article
                        key={vendorOrder.id}
                        className="rounded-xl border border-neutral-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/admin/vendors/${vendorOrder.vendorProfileId}`}
                              className="font-semibold text-[#0F3460] hover:underline"
                            >
                              {vendorOrder.vendorStoreName ??
                                vendorOrder.vendorStoreSlug ??
                                t("vendorFallback")}
                            </Link>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${vendorStatusClass(vendorOrder.status)}`}
                              >
                                {vendorOrder.status.replaceAll("_", " ")}
                              </span>
                              <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                                {deliveryMethodLabel(vendorOrder.deliveryMethod, t)}
                              </span>
                            </div>
                            {deliveredAt ? (
                              <p className="mt-2 text-xs text-emerald-700">
                                {t("detail.deliveredOn", {
                                  date: displayShortDate(deliveredAt),
                                })}
                              </p>
                            ) : null}
                          </div>
                          <dl className="min-w-[160px] space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <dt className="text-neutral-500">{t("detail.vendorTotal")}</dt>
                              <dd className="font-medium text-neutral-900">
                                {formatMoney(
                                  vendorOrder.grandTotalAmount,
                                  vendorOrder.currency
                                )}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-neutral-500">{t("detail.feeShort")}</dt>
                              <dd className="font-medium text-neutral-900">
                                {vendorOrder.commission.commissionAmount != null
                                  ? formatMoney(
                                      vendorOrder.commission.commissionAmount,
                                      vendorOrder.commission.currency ??
                                        vendorOrder.currency
                                    )
                                  : "—"}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className="text-neutral-500">{t("detail.payout")}</dt>
                              <dd>
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${payoutStatusClass(vendorOrder.payout.status)}`}
                                >
                                  {payoutStatusLabel(vendorOrder.payout.status, t)}
                                </span>
                              </dd>
                            </div>
                            {vendorOrder.payout.amount != null ? (
                              <div className="flex justify-between gap-4">
                                <dt className="text-neutral-500">{t("detail.payoutAmount")}</dt>
                                <dd className="font-medium text-neutral-900">
                                  {formatMoney(
                                    vendorOrder.payout.amount,
                                    vendorOrder.payout.currency ?? vendorOrder.currency
                                  )}
                                </dd>
                              </div>
                            ) : null}
                            {vendorOrder.payout.holdLabel ? (
                              <p className="text-xs text-neutral-500">
                                {vendorOrder.payout.holdLabel}
                              </p>
                            ) : vendorOrder.payout.holdUntil ? (
                              <p className="text-xs text-neutral-500">
                                {t("detail.holdUntil", {
                                  date: displayShortDate(vendorOrder.payout.holdUntil),
                                })}
                              </p>
                            ) : null}
                          </dl>
                        </div>

                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full min-w-[480px] text-sm">
                            <thead>
                              <tr className="border-b border-neutral-200 text-start text-xs font-semibold text-neutral-500">
                                <th className="py-2 pe-3">{t("detail.itemCol")}</th>
                                <th className="py-2 pe-3">{t("detail.qty")}</th>
                                <th className="py-2 pe-3">{t("detail.unit")}</th>
                                <th className="py-2">{t("detail.lineTotal")}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                              {vendorOrder.items.map((item) => (
                                <tr key={item.id}>
                                  <td className="py-2 pe-3 text-neutral-900">
                                    {item.productName}
                                    {item.variantName ? (
                                      <span className="block text-xs text-neutral-500">
                                        {item.variantName}
                                      </span>
                                    ) : null}
                                    {item.productSku ? (
                                      <span className="block text-xs text-neutral-500">
                                        {item.productSku}
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="py-2 pe-3">{item.quantity}</td>
                                  <td className="py-2 pe-3">
                                    {formatMoney(item.unitPriceAmount, item.currency)}
                                  </td>
                                  <td className="py-2">
                                    {formatMoney(item.lineTotalAmount, item.currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {vendorOrder.vendorLedgerEntries.length > 0 ? (
                          <details className="mt-3 rounded-lg border border-neutral-200 px-3 py-2">
                            <summary className="cursor-pointer text-sm font-medium text-neutral-700">
                              {t("detail.ledger")} ({vendorOrder.vendorLedgerEntries.length})
                            </summary>
                            <div className="mt-2 overflow-x-auto">
                              <table className="w-full min-w-[520px] text-sm">
                                <thead>
                                  <tr className="border-b border-neutral-100 text-start text-xs font-semibold text-neutral-500">
                                    <th className="py-1.5 pe-3">{t("detail.type")}</th>
                                    <th className="py-1.5 pe-3">{t("detail.amount")}</th>
                                    <th className="py-1.5 pe-3">{t("detail.date")}</th>
                                    <th className="py-1.5">{t("detail.note")}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                  {vendorOrder.vendorLedgerEntries.map((entry) => (
                                    <tr key={entry.id}>
                                      <td className="py-1.5 pe-3 text-neutral-700">
                                        {entry.entryType.replaceAll("_", " ")}
                                      </td>
                                      <td className="py-1.5 pe-3">
                                        {formatMoney(entry.amount, entry.currency)}
                                      </td>
                                      <td className="py-1.5 pe-3 text-neutral-500">
                                        {displayShortDate(entry.createdAt)}
                                      </td>
                                      <td className="py-1.5 text-neutral-500">
                                        {entry.description ?? "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </details>
                        ) : null}
                      </article>
                    );
                  })}
                </section>

                {detail.warehouse.batch ||
                detail.warehouse.outboundShipment ||
                detail.warehouse.inboundShipments.length > 0 ? (
                  <section className="rounded-xl border border-neutral-200 p-4">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      {t("detail.warehouse")}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {detail.warehouse.batch ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${warehouseStatusClass(detail.warehouse.batch.status)}`}
                        >
                          {t("detail.batch", {
                            status: detail.warehouse.batch.status.replaceAll("_", " "),
                          })}
                        </span>
                      ) : null}
                      {detail.warehouse.outboundShipment ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${warehouseStatusClass(detail.warehouse.outboundShipment.status)}`}
                        >
                          {t("detail.outbound", {
                            status: detail.warehouse.outboundShipment.status.replaceAll(
                              "_",
                              " "
                            ),
                          })}
                        </span>
                      ) : null}
                      {detail.warehouse.outboundShipment?.trackingRef ? (
                        <span className="text-xs text-neutral-500">
                          {t("detail.tracking", {
                            ref: detail.warehouse.outboundShipment.trackingRef,
                          })}
                        </span>
                      ) : null}
                    </div>
                    {detail.warehouse.inboundShipments.length > 0 ? (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                          <thead>
                            <tr className="border-b border-neutral-200 text-start text-xs font-semibold text-neutral-500">
                              <th className="py-2 pe-3">{t("detail.vendorCol")}</th>
                              <th className="py-2 pe-3">{t("detail.qty")}</th>
                              <th className="py-2 pe-3">{t("detail.statusCol")}</th>
                              <th className="py-2">{t("detail.trackingCol")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {detail.warehouse.inboundShipments.map((shipment) => (
                              <tr key={shipment.id}>
                                <td className="py-2 pe-3">
                                  {shipment.vendorStoreName ??
                                    shipment.vendorStoreSlug ??
                                    t("vendorFallback")}
                                </td>
                                <td className="py-2 pe-3">{shipment.totalQuantity}</td>
                                <td className="py-2 pe-3">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${warehouseStatusClass(shipment.status)}`}
                                  >
                                    {shipment.status.replaceAll("_", " ")}
                                  </span>
                                </td>
                                <td className="py-2 text-neutral-600">
                                  {shipment.trackingRef ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <AdminOrderDisputePanel
                  orderId={detail.id}
                  orderNumber={detail.orderNumber}
                  paymentStatus={detail.paymentStatus}
                  currency={detail.currency}
                  refundCases={detail.refundCases}
                  onUpdated={() => void refreshDetail()}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
