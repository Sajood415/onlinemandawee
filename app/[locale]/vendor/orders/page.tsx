"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { VendorConfirmDialog } from "@/components/vendor/products/VendorConfirmDialog";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { resolveVendorOrderDeliveredAtIso } from "@/lib/orders/resolve-vendor-order-delivered-at";
import { toast } from "@/lib/utils/toast";

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

type VendorOrderStatus =
  | "NEW"
  | "PREPARING"
  | "INBOUND_SHIPPED"
  | "RECEIVED_AT_WAREHOUSE"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type WarehouseInboundShipmentStatus =
  | "PENDING_SHIPMENT"
  | "INBOUND_SHIPPED"
  | "RECEIVED";

type VendorOrder = {
  id: string;
  status: VendorOrderStatus;
  sellerType: "PLATFORM" | "THIRD_PARTY";
  deliveryMethod: "PICKUP" | "EXPRESS" | "STANDARD" | null;
  trackingRef: string | null;
  currency: string;
  subtotalAmount: number;
  deliveryAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  deliveredAt: string | null;
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
    cancelledAt: string | null;
    cancellationReason: string | null;
    cancelledByRole: "CUSTOMER" | "VENDOR" | "ADMIN" | "SYSTEM" | null;
  };
  warehouse: {
    inboundShipment: {
      id: string;
      status: WarehouseInboundShipmentStatus;
      trackingRef: string | null;
      shippedAt: string | null;
      receivedAt: string | null;
    } | null;
    batch: {
      id: string;
      status: string;
      expectedVendorCount: number;
      receivedVendorCount: number;
      readyToConsolidateAt: string | null;
    } | null;
    outboundShipment: {
      id: string;
      status: string;
      trackingRef: string | null;
      consolidatedAt: string | null;
      shippedAt: string | null;
      deliveredAt: string | null;
    } | null;
  };
  items: OrderItem[];
};

const STATUS_COLORS: Record<VendorOrderStatus, string> = {
  NEW: "bg-blue-50 text-blue-700 ring-blue-200",
  PREPARING: "bg-amber-50 text-amber-800 ring-amber-200",
  INBOUND_SHIPPED: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  RECEIVED_AT_WAREHOUSE: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  SHIPPED: "bg-sky-50 text-sky-800 ring-sky-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
};

const FILTER_STATUSES: Array<VendorOrderStatus | "ALL"> = [
  "ALL",
  "NEW",
  "PREPARING",
  "INBOUND_SHIPPED",
  "RECEIVED_AT_WAREHOUSE",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

function formatCurrency(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string | null, locale: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isStandardWorkflow(order: VendorOrder) {
  return order.deliveryMethod === "STANDARD" && order.sellerType === "THIRD_PARTY";
}

function WarehouseProgress({
  order,
  locale,
}: {
  order: VendorOrder;
  locale: string;
}) {
  const t = useTranslations("VendorPages.orders");
  const inbound = order.warehouse.inboundShipment;
  const batch = order.warehouse.batch;
  const outbound = order.warehouse.outboundShipment;

  let step1Detail = t("warehouse.waitingSend");
  if (inbound?.status === "INBOUND_SHIPPED") {
    step1Detail = t("warehouse.onTheWayToWarehouse");
  } else if (inbound?.status === "RECEIVED") {
    step1Detail = t("warehouse.receivedAtWarehouse");
  }

  let step2Detail = t("warehouse.notStarted");
  if (batch) {
    if (batch.status === "PARTIALLY_RECEIVED" || batch.status === "OPEN") {
      step2Detail = t("warehouse.waitingOtherVendors", {
        received: batch.receivedVendorCount,
        expected: batch.expectedVendorCount,
      });
    } else if (
      batch.status === "READY_TO_CONSOLIDATE" ||
      batch.status === "CONSOLIDATED"
    ) {
      step2Detail = t("warehouse.packingTogether");
    } else if (
      batch.status === "OUTBOUND_SHIPPED" ||
      batch.status === "DELIVERED"
    ) {
      step2Detail = t("warehouse.readyToShip");
    } else {
      step2Detail = t("warehouse.packingTogether");
    }
  } else if (inbound?.status === "RECEIVED") {
    step2Detail = t("warehouse.receivedAtWarehouse");
  }

  let step3Detail = t("warehouse.notStarted");
  if (outbound?.status === "OUTBOUND_SHIPPED") {
    step3Detail = t("warehouse.onTheWayToCustomer");
  } else if (outbound?.status === "DELIVERED" || order.status === "DELIVERED") {
    step3Detail = t("warehouse.deliveredToCustomer");
  } else if (outbound?.status === "CONSOLIDATED") {
    step3Detail = t("warehouse.readyToShip");
  }

  const step1Done =
    inbound?.status === "RECEIVED" ||
    Boolean(inbound?.receivedAt) ||
    order.status === "RECEIVED_AT_WAREHOUSE" ||
    order.status === "DELIVERED";
  const step1Active =
    !step1Done &&
    (inbound?.status === "INBOUND_SHIPPED" ||
      order.status === "INBOUND_SHIPPED");
  const step2Done =
    Boolean(outbound) ||
    batch?.status === "OUTBOUND_SHIPPED" ||
    batch?.status === "DELIVERED" ||
    order.status === "DELIVERED";
  const step2Active = step1Done && !step2Done;
  const step3Done =
    outbound?.status === "DELIVERED" || order.status === "DELIVERED";
  const step3Active = step2Done && !step3Done;

  const steps = [
    {
      title: t("warehouse.step1Title"),
      detail: step1Detail,
      active: step1Active,
      done: step1Done,
      meta: [
        inbound?.trackingRef
          ? t("warehouse.tracking", { ref: inbound.trackingRef })
          : null,
        inbound?.shippedAt
          ? t("warehouse.sent", {
              date: formatDateTime(inbound.shippedAt, locale),
            })
          : null,
        inbound?.receivedAt
          ? t("warehouse.received", {
              date: formatDateTime(inbound.receivedAt, locale),
            })
          : null,
      ].filter(Boolean) as string[],
    },
    {
      title: t("warehouse.step2Title"),
      detail: step2Detail,
      active: step2Active,
      done: step2Done,
      meta: [
        batch?.readyToConsolidateAt
          ? t("warehouse.ready", {
              date: formatDateTime(batch.readyToConsolidateAt, locale),
            })
          : null,
      ].filter(Boolean) as string[],
    },
    {
      title: t("warehouse.step3Title"),
      detail: step3Detail,
      active: step3Active,
      done: step3Done,
      meta: [
        outbound?.trackingRef
          ? t("warehouse.tracking", { ref: outbound.trackingRef })
          : null,
        outbound?.shippedAt
          ? t("warehouse.shipped", {
              date: formatDateTime(outbound.shippedAt, locale),
            })
          : null,
        outbound?.deliveredAt
          ? t("warehouse.delivered", {
              date: formatDateTime(outbound.deliveredAt, locale),
            })
          : null,
      ].filter(Boolean) as string[],
    },
  ];

  return (
    <section className="rounded-2xl border border-primary/10 bg-linear-to-b from-primary/4 to-white p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-neutral-900">
        {t("warehouse.title")}
      </h3>
      <ol className="mt-4 grid gap-0 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="relative flex gap-3 sm:flex-col sm:px-2 sm:text-center"
          >
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={`absolute inset-s-3 top-7 hidden h-[calc(100%-1.75rem)] w-px sm:inset-s-auto sm:top-3 sm:left-[calc(50%+1.25rem)] sm:block sm:h-px sm:w-[calc(100%-2.5rem)] ${
                  step.done ? "bg-emerald-400" : "bg-neutral-200"
                }`}
              />
            ) : null}
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={`absolute inset-s-3 top-7 h-[calc(100%-0.5rem)] w-px sm:hidden ${
                  step.done ? "bg-emerald-400" : "bg-neutral-200"
                }`}
              />
            ) : null}
            <span
              className={`relative z-1 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:mx-auto ${
                step.done
                  ? "bg-emerald-500 text-white"
                  : step.active
                    ? "bg-primary text-white ring-4 ring-primary/15"
                    : "bg-white text-neutral-400 ring-1 ring-neutral-200"
              }`}
            >
              {step.done ? <Check size={14} strokeWidth={3} /> : index + 1}
            </span>
            <div className="min-w-0 flex-1 pb-4 sm:pb-0 sm:pt-2">
              <p
                className={`text-sm font-semibold ${
                  step.active || step.done
                    ? "text-neutral-900"
                    : "text-neutral-500"
                }`}
              >
                {step.title}
              </p>
              <p className="mt-0.5 text-sm text-neutral-600">{step.detail}</p>
              {step.meta.length > 0 ? (
                <div className="mt-2 space-y-0.5 text-xs text-neutral-500 sm:mx-auto sm:max-w-56">
                  {step.meta.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function OrderRow({
  order,
  locale,
  onStatusChange,
  onRequestCancel,
  onInboundShip,
}: {
  order: VendorOrder;
  locale: string;
  onStatusChange: (
    vendorOrderId: string,
    status: VendorOrderStatus,
    trackingRef?: string
  ) => Promise<void>;
  onRequestCancel: (order: VendorOrder) => void;
  onInboundShip: (vendorOrderId: string, trackingRef?: string) => Promise<void>;
}) {
  const t = useTranslations("VendorPages.orders");
  const [expanded, setExpanded] = useState(false);
  const [trackingRef, setTrackingRef] = useState(
    order.warehouse.inboundShipment?.trackingRef ?? ""
  );
  const [expressTrackingRef, setExpressTrackingRef] = useState(
    order.trackingRef ?? ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState<VendorOrderStatus | null>(null);

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const standard = isStandardWorkflow(order);
  const cancelledByCustomer =
    order.status === "CANCELLED" && order.order.cancelledByRole === "CUSTOMER";

  const deliveredAt = resolveVendorOrderDeliveredAtIso({
    status: order.status,
    deliveredAt: order.deliveredAt,
    outboundDeliveredAt: order.warehouse.outboundShipment?.deliveredAt,
    statusChangedAt: order.updatedAt,
  });

  const alreadySentToWarehouse =
    order.status === "INBOUND_SHIPPED" ||
    order.status === "RECEIVED_AT_WAREHOUSE" ||
    order.warehouse.inboundShipment?.status === "INBOUND_SHIPPED" ||
    order.warehouse.inboundShipment?.status === "RECEIVED";

  const canSendToWarehouse =
    standard &&
    !alreadySentToWarehouse &&
    (order.status === "NEW" || order.status === "PREPARING");

  const canCancel =
    order.status === "NEW" || order.status === "PREPARING";

  const needsYou =
    canSendToWarehouse ||
    (!standard &&
      (order.status === "NEW" ||
        order.status === "PREPARING" ||
        order.status === "SHIPPED"));

  const runStatus = async (status: VendorOrderStatus) => {
    setUpdating(status);
    try {
      const trackingForShip =
        status === "SHIPPED" && order.deliveryMethod === "EXPRESS"
          ? expressTrackingRef.trim() || undefined
          : undefined;
      await onStatusChange(order.id, status, trackingForShip);
    } finally {
      setUpdating(null);
    }
  };

  const paymentLabels: Record<string, string> = {
    PENDING: t("payment.PENDING"),
    PAID: t("payment.PAID"),
    UNPAID: t("payment.UNPAID"),
    PARTIALLY_REFUNDED: t("payment.PARTIALLY_REFUNDED"),
    REFUNDED: t("payment.REFUNDED"),
    FULLY_REFUNDED: t("payment.FULLY_REFUNDED"),
  };

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        needsYou ? "border-amber-200" : "border-neutral-200"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-col gap-3 px-4 py-4 text-start sm:flex-row sm:items-center sm:gap-4 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-primary">
              #{order.order.orderNumber}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_COLORS[order.status]}`}
            >
              {t(`statuses.${order.status}`)}
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-700">
              {paymentLabels[order.order.paymentStatus] ??
                order.order.paymentStatus.replaceAll("_", " ")}
            </span>
            {standard ? (
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                {t("standardBadge")}
              </span>
            ) : null}
            {needsYou ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                {t("needsYou")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {t("placed", { date: formatDate(order.createdAt, locale) })}
          </p>
          {cancelledByCustomer && order.order.cancelledAt ? (
            <p className="mt-0.5 text-xs text-rose-700">
              {t("cancelledOn", {
                date: formatDateTime(order.order.cancelledAt, locale),
              })}
            </p>
          ) : null}
          {order.status === "DELIVERED" && deliveredAt ? (
            <p className="mt-0.5 text-xs text-emerald-700">
              {t("deliveredOn", {
                date: formatDateTime(deliveredAt, locale),
              })}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 sm:w-44">
          <p className="truncate text-sm font-medium text-neutral-800">
            {order.order.shippingFullName}
          </p>
          <p className="truncate text-xs text-neutral-500">
            {order.order.shippingPhone}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:w-36 sm:flex-col sm:items-end">
          <span className="text-xs text-neutral-500">
            {totalItems === 1
              ? t("itemCount", { count: totalItems })
              : t("itemCountPlural", { count: totalItems })}
          </span>
          <span className="text-sm font-bold text-primary">
            {formatCurrency(order.grandTotalAmount, order.currency, locale)}
          </span>
        </div>

        <span className="text-neutral-400 sm:ms-1">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {expanded ? (
        <div className="space-y-5 border-t border-neutral-100 px-4 py-5 sm:px-5">
          {cancelledByCustomer ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <p className="font-semibold">{t("cancelledByCustomer")}</p>
              {order.order.cancelledAt ? (
                <p className="mt-1">
                  {t("cancelledOn", {
                    date: formatDateTime(order.order.cancelledAt, locale),
                  })}
                </p>
              ) : null}
              <p className="mt-2">
                {order.order.cancellationReason
                  ? t("reason", { reason: order.order.cancellationReason })
                  : t("noReason")}
              </p>
            </div>
          ) : null}

          <div
            className={`rounded-2xl border p-4 sm:p-5 ${
              needsYou
                ? "border-primary/20 bg-primary/5"
                : "border-neutral-100 bg-neutral-50/60"
            }`}
          >
            <p className="mb-3 text-sm font-semibold text-neutral-900">
              {t("updateStatus")}
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_COLORS[order.status]}`}
              >
                {t("currentStatus", {
                  status: t(`statuses.${order.status}`),
                })}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-200">
                {t("deliveryMethod", {
                  method: order.deliveryMethod
                    ? t(`deliveryMethods.${order.deliveryMethod}`)
                    : t("deliveryMethods.unknown"),
                })}
              </span>
            </div>

            {!standard ? (
              <div className="space-y-3">
                {order.deliveryMethod === "EXPRESS" && order.status === "PREPARING" ? (
                  <label className="block text-sm text-neutral-700">
                    {t("actions.trackingOptional")}
                    <input
                      value={expressTrackingRef}
                      onChange={(e) => setExpressTrackingRef(e.target.value)}
                      disabled={Boolean(updating)}
                      placeholder={t("actions.trackingPlaceholder")}
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                  </label>
                ) : null}
                {order.deliveryMethod === "EXPRESS" && order.trackingRef ? (
                  <p className="text-sm text-neutral-700">
                    {t("actions.trackingLabel", { ref: order.trackingRef })}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                {order.status === "NEW" ? (
                  <button
                    type="button"
                    disabled={Boolean(updating)}
                    onClick={() => void runStatus("PREPARING")}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                  >
                    {updating === "PREPARING" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {t("actions.prepare")}
                  </button>
                ) : null}
                {order.status === "PREPARING" ? (
                  <button
                    type="button"
                    disabled={Boolean(updating)}
                    onClick={() => void runStatus("SHIPPED")}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                  >
                    {updating === "SHIPPED" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {t("actions.ship")}
                  </button>
                ) : null}
                {order.status === "SHIPPED" ? (
                  <button
                    type="button"
                    disabled={Boolean(updating)}
                    onClick={() => void runStatus("DELIVERED")}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {updating === "DELIVERED" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {t("actions.deliver")}
                  </button>
                ) : null}
                {canCancel ? (
                  <button
                    type="button"
                    disabled={Boolean(updating)}
                    onClick={() => onRequestCancel(order)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {t("actions.cancel")}
                  </button>
                ) : null}
                {!needsYou && !canCancel ? (
                  <p className="text-sm text-neutral-600">
                    {t("noActionNeeded")}
                  </p>
                ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-neutral-700">
                  {t("actions.warehouseHelp")}
                </p>
                {canSendToWarehouse ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="min-w-0 flex-1 text-sm text-neutral-700">
                      {t("actions.trackingOptional")}
                      <input
                        value={trackingRef}
                        onChange={(e) => setTrackingRef(e.target.value)}
                        disabled={submitting}
                        placeholder={t("actions.trackingPlaceholder")}
                        className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setSubmitting(true);
                        void onInboundShip(
                          order.id,
                          trackingRef.trim() || undefined
                        ).finally(() => setSubmitting(false));
                      }}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : null}
                      {t("actions.sendWarehouse")}
                    </button>
                  </div>
                ) : alreadySentToWarehouse ? (
                  <div className="space-y-1 text-sm text-neutral-700">
                    <p className="font-medium">{t("actions.alreadySent")}</p>
                    <p>
                      {t("actions.trackingLabel", {
                        ref:
                          order.warehouse.inboundShipment?.trackingRef ?? "—",
                      })}
                    </p>
                    <p>
                      {t("actions.sentAt", {
                        date: formatDateTime(
                          order.warehouse.inboundShipment?.shippedAt ?? null,
                          locale
                        ),
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600">
                    {t("noActionNeeded")}
                  </p>
                )}
                {canCancel ? (
                  <button
                    type="button"
                    onClick={() => onRequestCancel(order)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    {t("actions.cancel")}
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {standard ? <WarehouseProgress order={order} locale={locale} /> : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("deliveryAddress")}
              </p>
              <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
                <p className="font-medium text-neutral-900">
                  {order.order.shippingFullName}
                </p>
                <p className="mt-1">{order.order.shippingAddressLine1}</p>
                <p>
                  {order.order.shippingCity}
                  {order.order.shippingPostalCode
                    ? `, ${order.order.shippingPostalCode}`
                    : ""}
                </p>
                <p>{order.order.shippingCountry}</p>
                {order.order.shippingPhone ? (
                  <p className="mt-2 text-neutral-500">
                    {order.order.shippingPhone}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("itemsOrdered")}
              </p>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl bg-neutral-50 p-3"
                  >
                    {item.productImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.productImage}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg border border-neutral-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-200">
                        <Package size={16} className="text-neutral-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {item.productName}
                      </p>
                      {item.productSku ? (
                        <p className="text-xs text-neutral-400">
                          {t("sku", { sku: item.productSku })}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-xs text-neutral-500">
                        {item.quantity} ×{" "}
                        {formatCurrency(
                          item.unitPriceAmount,
                          item.currency,
                          locale
                        )}
                      </p>
                      <p className="text-sm font-semibold text-neutral-900">
                        {formatCurrency(
                          item.lineTotalAmount,
                          item.currency,
                          locale
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-sm">
                <div className="flex justify-between text-neutral-500">
                  <span>{t("subtotal")}</span>
                  <span>
                    {formatCurrency(
                      order.subtotalAmount,
                      order.currency,
                      locale
                    )}
                  </span>
                </div>
                {order.discountAmount > 0 ? (
                  <div className="flex justify-between text-neutral-500">
                    <span>{t("discount")}</span>
                    <span>
                      −
                      {formatCurrency(
                        order.discountAmount,
                        order.currency,
                        locale
                      )}
                    </span>
                  </div>
                ) : null}
                {order.deliveryAmount > 0 ? (
                  <div className="flex justify-between text-neutral-500">
                    <span>{t("delivery")}</span>
                    <span>
                      {formatCurrency(
                        order.deliveryAmount,
                        order.currency,
                        locale
                      )}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-neutral-100 pt-1 font-bold text-primary">
                  <span>{t("total")}</span>
                  <span>
                    {formatCurrency(
                      order.grandTotalAmount,
                      order.currency,
                      locale
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function VendorOrdersPage() {
  const t = useTranslations("VendorPages.orders");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("VENDOR");

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cancelTarget, setCancelTarget] = useState<VendorOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const hasFetched = useRef(false);

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth("/api/vendor/orders");
        const data = await parseApiResponse<VendorOrder[]>(res);
        setOrders(data);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : t("loadError");
        if (!silent) {
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [t]
  );

  const applyStatus = useCallback(
    async (
      vendorOrderId: string,
      status: VendorOrderStatus,
      trackingRef?: string
    ) => {
      try {
        const res = await fetchWithAuth(
          `/api/vendor/orders/${vendorOrderId}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status,
              ...(trackingRef ? { trackingRef } : {}),
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json();
          toast.error(
            t("toasts.updateError"),
            data?.error?.message
          );
          return;
        }
        if (status === "DELIVERED") {
          toast.success(t("payoutHold"));
        } else if (status === "CANCELLED") {
          toast.success(t("toasts.cancelledRefunded"));
        } else {
          toast.success(
            t("toasts.updated", { status: t(`statuses.${status}`) })
          );
        }
        await fetchOrders(true);
      } catch {
        toast.error(t("toasts.networkError"));
      }
    },
    [fetchOrders, t]
  );

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await applyStatus(cancelTarget.id, "CANCELLED");
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  const handleInboundShip = useCallback(
    async (vendorOrderId: string, trackingRef?: string) => {
      try {
        const res = await fetchWithAuth(
          `/api/vendor/orders/${vendorOrderId}/inbound-ship`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trackingRef: trackingRef?.trim()
                ? trackingRef.trim()
                : undefined,
            }),
          }
        );
        await parseApiResponse(res);
        toast.success(t("toasts.warehouseSent"));
        await fetchOrders(true);
      } catch (error) {
        toast.error(
          t("toasts.warehouseError"),
          error instanceof Error ? error.message : undefined
        );
      }
    },
    [fetchOrders, t]
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
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      o.order.orderNumber.toLowerCase().includes(q) ||
      o.order.shippingFullName.toLowerCase().includes(q) ||
      o.order.shippingPhone.toLowerCase().includes(q) ||
      o.items.some(
        (item) =>
          item.productName.toLowerCase().includes(q) ||
          (item.productSku ?? "").toLowerCase().includes(q)
      );
    const matchesStatus =
      statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filterResetKey = `${search}|${statusFilter}`;

  const {
    paginatedItems: paginatedOrders,
    pageIndex,
    pageCount,
    pageSize,
    pageSizeOptions,
    setPageIndex,
    setPageSize,
  } = useClientPagination(filtered, {
    initialPageSize: 10,
    resetKey: filterResetKey,
  });

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-neutral-400" size={28} />
      </div>
    );
  }

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
            href="/vendor/disputes"
            className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t("disputesLink")}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void fetchOrders()}
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
        <div className="space-y-3 border-b border-neutral-100 px-4 py-4 sm:px-5">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 rtl:pl-3 rtl:pr-9"
            />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {FILTER_STATUSES.map((value) => {
              const active = statusFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-primary text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {value === "ALL"
                    ? t("allStatuses")
                    : t(`statuses.${value}`)}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-sm text-neutral-600">
            <Loader2 className="animate-spin text-neutral-400" size={28} />
            {t("loading")}
          </div>
        ) : error ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="text-sm font-medium text-primary underline"
            >
              {t("tryAgain")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
              <Package size={24} className="text-neutral-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800">
                {orders.length === 0 ? t("empty") : t("emptyFiltered")}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {orders.length === 0
                  ? t("emptyHint")
                  : t("emptyFilteredHint")}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <p className="text-xs text-neutral-500">
                {t("showing", {
                  shown: filtered.length,
                  total: orders.length,
                })}
              </p>
              {paginatedOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  locale={locale}
                  onStatusChange={applyStatus}
                  onRequestCancel={setCancelTarget}
                  onInboundShip={handleInboundShip}
                />
              ))}
            </div>
            <PaginationFooter
              pageIndex={pageIndex}
              pageCount={pageCount}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageIndexChange={setPageIndex}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      <VendorConfirmDialog
        open={Boolean(cancelTarget)}
        title={t("cancelConfirm.title")}
        body={t("cancelConfirm.body", {
          orderNumber: cancelTarget?.order.orderNumber ?? "",
        })}
        confirmLabel={t("cancelConfirm.confirm")}
        cancelLabel={t("cancelConfirm.cancel")}
        danger
        busy={cancelling}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
