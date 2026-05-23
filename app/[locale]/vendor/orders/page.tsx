"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

/* ─── Types ──────────────────────────────────────────────────────────── */

type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  productSku: string | null;
  quantity: number;
  currency: string;
  unitPriceAmount: number;
  lineTotalAmount: number;
};

type VendorOrderStatus = "NEW" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

type VendorOrder = {
  id: string;
  status: VendorOrderStatus;
  currency: string;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    shippingFullName: string;
    shippingPhone: string;
    shippingAddressLine1: string;
    shippingCity: string;
    shippingCountry: string;
    shippingPostalCode: string;
  };
  items: OrderItem[];
};

/* ─── Helpers ────────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<VendorOrderStatus, string> = {
  NEW: "bg-blue-50 text-blue-700 border border-blue-200",
  PREPARING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  SHIPPED: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  DELIVERED: "bg-green-50 text-green-700 border border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
};

const STATUS_LABELS: Record<VendorOrderStatus, string> = {
  NEW: "New",
  PREPARING: "Preparing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

// Allowed transitions from each status
const NEXT_STATUSES: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  NEW: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const NEXT_STATUS_LABELS: Record<VendorOrderStatus, string> = {
  NEW: "New",
  PREPARING: "Accept & Prepare",
  SHIPPED: "Mark Shipped",
  DELIVERED: "Mark Delivered",
  CANCELLED: "Cancel Order",
};

const NEXT_STATUS_COLORS: Record<VendorOrderStatus, string> = {
  NEW: "bg-gray-100 text-gray-600",
  PREPARING: "bg-indigo-600 text-white hover:bg-indigo-700",
  SHIPPED: "bg-cyan-600 text-white hover:bg-cyan-700",
  DELIVERED: "bg-green-600 text-white hover:bg-green-700",
  CANCELLED: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  PAID: "bg-green-50 text-green-700",
  UNPAID: "bg-orange-50 text-orange-700",
  PARTIALLY_REFUNDED: "bg-orange-50 text-orange-700",
  FULLY_REFUNDED: "bg-red-50 text-red-700",
};

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ─── Status Change Buttons ──────────────────────────────────────────── */

function StatusActions({
  order,
  onStatusChange,
}: {
  order: VendorOrder;
  onStatusChange: (vendorOrderId: string, status: VendorOrderStatus) => Promise<void>;
}) {
  const nextStatuses = NEXT_STATUSES[order.status];
  const [updating, setUpdating] = useState<VendorOrderStatus | null>(null);

  if (nextStatuses.length === 0) return null;

  const handleChange = async (status: VendorOrderStatus) => {
    if (status === "CANCELLED") {
      if (!confirm(`Cancel order #${order.order.orderNumber}? This cannot be undone.`)) return;
    }
    setUpdating(status);
    try {
      await onStatusChange(order.id, status);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {nextStatuses.map((s) => (
        <button
          key={s}
          disabled={!!updating}
          onClick={(e) => { e.stopPropagation(); void handleChange(s); }}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${NEXT_STATUS_COLORS[s]}`}
        >
          {updating === s ? <Loader2 size={13} className="animate-spin" /> : null}
          {NEXT_STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

/* ─── Order Row Component ────────────────────────────────────────────── */

function OrderRow({
  order,
  onStatusChange,
}: {
  order: VendorOrder;
  onStatusChange: (vendorOrderId: string, status: VendorOrderStatus) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Header row — click to expand */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0"
      >
        {/* Order number + date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-[#0f3460] text-sm">
              #{order.order.orderNumber}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[order.order.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
              {order.order.paymentStatus.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
        </div>

        {/* Customer */}
        <div className="sm:w-48 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{order.order.shippingFullName}</p>
          <p className="text-xs text-gray-400 truncate">{order.order.shippingPhone}</p>
        </div>

        {/* Items + total */}
        <div className="sm:w-40 text-right flex sm:flex-col items-center sm:items-end gap-3 sm:gap-0">
          <span className="text-xs text-gray-400">{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
          <span className="text-sm font-bold text-[#0f3460]">
            {formatCurrency(order.grandTotalAmount, order.currency)}
          </span>
        </div>

        <div className="sm:ml-4 text-gray-400">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-6 py-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery address */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Delivery Address</p>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-0.5">
                <p className="font-medium text-gray-900">{order.order.shippingFullName}</p>
                <p>{order.order.shippingAddressLine1}</p>
                <p>
                  {order.order.shippingCity}
                  {order.order.shippingPostalCode ? `, ${order.order.shippingPostalCode}` : ""}
                </p>
                <p>{order.order.shippingCountry}</p>
                {order.order.shippingPhone && (
                  <p className="text-gray-500 pt-1">{order.order.shippingPhone}</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Items Ordered</p>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                    {item.productImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.productImage} alt={item.productName}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                      {item.productSku && <p className="text-xs text-gray-400">SKU: {item.productSku}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {formatCurrency(item.unitPriceAmount, item.currency)}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.lineTotalAmount, item.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-3 space-y-1 text-sm border-t border-gray-100 pt-3">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotalAmount, order.currency)}</span>
                </div>
                {order.deliveryAmount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery</span>
                    <span>{formatCurrency(order.deliveryAmount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#0f3460] pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatCurrency(order.grandTotalAmount, order.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status actions */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Update Order Status
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                Current: {STATUS_LABELS[order.status]}
              </span>
              <StatusActions order={order} onStatusChange={onStatusChange} />
            </div>
            {order.status === "SHIPPED" && (
              <p className="text-xs text-cyan-600 mt-2">
                📧 An email was sent to the customer notifying them their order has shipped.
              </p>
            )}
            {order.status === "DELIVERED" && (
              <p className="text-xs text-green-600 mt-2">
                📧 An email was sent to the customer confirming delivery.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Filter options ─────────────────────────────────────────────────── */

const STATUS_FILTER_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "New", value: "NEW" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function VendorOrdersPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("VENDOR");

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const hasFetched = useRef(false);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/vendor/orders");
      const data = await parseApiResponse<VendorOrder[]>(res);
      setOrders(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load orders.";
      if (!silent) {
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const handleStatusChange = useCallback(
    async (vendorOrderId: string, status: VendorOrderStatus) => {
      try {
        const res = await fetchWithAuth(`/api/vendor/orders/${vendorOrderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data?.error?.message ?? "Could not update status.");
          return;
        }
        toast.success(`Order marked as ${STATUS_LABELS[status]}.`);
        // Update order locally for instant feedback
        setOrders((prev) =>
          prev.map((o) => (o.id === vendorOrderId ? { ...o, status } : o))
        );
      } catch {
        toast.error("Network error. Please try again.");
      }
    },
    []
  );

  useEffect(() => {
    if (!user || hasFetched.current) return;
    hasFetched.current = true;
    void fetchOrders();
  }, [user, fetchOrders]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchOrders(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      search.trim() === "" ||
      o.order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.order.shippingFullName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f3460]">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage orders containing your products</p>
        </div>
        <button
          onClick={() => fetchOrders()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by order # or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10 transition cursor-pointer"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="animate-spin text-gray-400" size={28} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={() => fetchOrders()} className="text-sm text-[#0f3460] underline">Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Package size={24} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {orders.length === 0 ? "No orders yet" : "No orders match your filters"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {orders.length === 0
                ? "Orders containing your products will appear here."
                : "Try adjusting your search or status filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Showing {filtered.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
          {filtered.map((order) => (
            <OrderRow key={order.id} order={order} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
