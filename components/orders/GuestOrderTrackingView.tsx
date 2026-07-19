"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { Mail, MapPin, Package, Phone } from "lucide-react";

import {
  GUEST_VENDOR_STATUS_LABELS,
  getGuestOrderTrackingCopy,
} from "@/components/orders/guest-order-tracking-copy";
import { CatalogImage } from "@/components/catalog/CatalogImage";
import { Link } from "@/i18n/navigation";
import type { GuestPublicOrder } from "@/lib/orders/guest-public-order-types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

type ProgressStep = "placed" | "preparing" | "shipped" | "delivered";

function formatMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale === "fa-AF" ? "fa-AF" : locale === "ps" ? "ps-AF" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function overallOrderStatus(order: GuestPublicOrder) {
  const facing = order.vendorOrders.map(customerFacingVendorStatus);
  if (facing.length === 0) return order.status || "NEW";
  if (facing.every((status) => status === "CANCELLED")) return "CANCELLED";
  if (facing.every((status) => status === "DELIVERED")) return "DELIVERED";
  if (facing.some((status) => status === "SHIPPED")) return "SHIPPED";
  if (facing.some((status) => status === "PREPARING")) return "PREPARING";
  return "NEW";
}

function progressIndex(status: string): number {
  if (status === "CANCELLED") return -1;
  if (status === "DELIVERED") return 3;
  if (status === "SHIPPED") return 2;
  if (status === "PREPARING" || status === "INBOUND_SHIPPED" || status === "RECEIVED_AT_WAREHOUSE")
    return 1;
  return 0;
}

function customerFacingVendorStatus(vendorOrder: GuestPublicOrder["vendorOrders"][number]) {
  const outbound = vendorOrder.warehouse.outboundShipment;
  if (vendorOrder.status === "CANCELLED") return "CANCELLED";
  if (vendorOrder.status === "DELIVERED" || outbound?.status === "DELIVERED") return "DELIVERED";
  if (vendorOrder.status === "SHIPPED" || outbound?.status === "OUTBOUND_SHIPPED") return "SHIPPED";
  if (
    ["PREPARING", "INBOUND_SHIPPED", "RECEIVED_AT_WAREHOUSE"].includes(vendorOrder.status) ||
    outbound?.status === "CONSOLIDATED"
  ) {
    return "PREPARING";
  }
  return "NEW";
}

function deliveryMethodLabel(
  method: GuestPublicOrder["vendorOrders"][number]["deliveryMethod"],
  copy: ReturnType<typeof getGuestOrderTrackingCopy>
) {
  if (method === "STANDARD") return copy.methodStandard;
  if (method === "EXPRESS") return copy.methodExpress;
  if (method === "PICKUP") return copy.methodPickup;
  return "—";
}

function customerFacingTrackingRef(
  vendorOrder: GuestPublicOrder["vendorOrders"][number]
): string | null {
  if (vendorOrder.deliveryMethod === "STANDARD") {
    return vendorOrder.warehouse.outboundShipment?.trackingRef?.trim() || null;
  }
  if (vendorOrder.deliveryMethod === "EXPRESS") {
    return vendorOrder.trackingRef?.trim() || null;
  }
  return null;
}

type GuestOrderTrackingViewProps = {
  order: GuestPublicOrder;
  showLookupPrompt?: boolean;
};

export function GuestOrderTrackingView({
  order,
  showLookupPrompt = false,
}: GuestOrderTrackingViewProps) {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getGuestOrderTrackingCopy(locale);
  const summaryStatus = overallOrderStatus(order);
  const activeStep = progressIndex(summaryStatus);
  const signupHref = `/auth/signup?redirect=${encodeURIComponent("/account")}`;

  const placedLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "fa-AF" ? "fa-AF" : locale === "ps" ? "ps-AF" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(order.createdAt)),
    [locale, order.createdAt]
  );

  const steps: { key: ProgressStep; label: string }[] = [
    { key: "placed", label: copy.stepPlaced },
    { key: "preparing", label: copy.stepPreparing },
    { key: "shipped", label: copy.stepShipped },
    { key: "delivered", label: copy.stepDelivered },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="space-y-5">
      <section className="border border-neutral-200/80 bg-white px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-neutral-500">
              {copy.placed} · {placedLabel}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
              {order.orderNumber}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {copy.customer}: <span className="font-medium text-neutral-900">{order.customerName}</span>
            </p>
          </div>
          <span className="inline-flex w-fit border border-[#0F3460]/20 bg-[#0F3460]/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#0F3460]">
            {GUEST_VENDOR_STATUS_LABELS[summaryStatus]?.[locale] ?? summaryStatus}
          </span>
        </div>

        {summaryStatus === "CANCELLED" ? (
          <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {copy.cancelledNote}
          </p>
        ) : (
          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
              {copy.progress}
            </p>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {steps.map((step, index) => {
                const done = activeStep >= index;
                const current = activeStep === index;
                return (
                  <li key={step.key} className="min-w-0">
                    <div
                      className={`h-1 w-full ${done ? "bg-[#0F3460]" : "bg-neutral-200"}`}
                      aria-hidden
                    />
                    <p
                      className={`mt-2 text-sm font-medium ${
                        current
                          ? "text-[#0F3460]"
                          : done
                            ? "text-neutral-800"
                            : "text-neutral-400"
                      }`}
                    >
                      {step.label}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="mt-6 grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {copy.orderTotal}
            </p>
            <p className="mt-1 text-lg font-bold text-neutral-900">
              {formatMoney(order.grandTotalAmount, order.currency, locale)}
            </p>
            <p className="mt-0.5 text-sm text-neutral-500">{copy.cardPaid}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {copy.contact}
            </p>
            <div className="mt-1.5 space-y-1 text-sm text-neutral-700">
              {order.contact.email ? (
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <bdi>{order.contact.email}</bdi>
                </p>
              ) : null}
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <bdi>{order.contact.phone}</bdi>
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {copy.shippingTo}
            </p>
            <p className="mt-1.5 flex items-start gap-2 text-sm leading-relaxed text-neutral-700">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
              <span>
                {order.shippingAddress.addressLine1}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.country}
                {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ""}
              </span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-neutral-400">{copy.privacyNote}</p>
      </section>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-400">
          {copy.shipments}
        </h3>

        {order.vendorOrders.map((vendorOrder, vendorIndex) => {
          const facingStatus = customerFacingVendorStatus(vendorOrder);
          const trackingNumber = customerFacingTrackingRef(vendorOrder);
          const showTracking =
            vendorOrder.deliveryMethod === "STANDARD" ||
            vendorOrder.deliveryMethod === "EXPRESS";
          return (
            <section
              key={`${vendorOrder.storeName ?? "vendor"}-${vendorIndex}`}
              className="border border-neutral-200/80 bg-white px-5 py-5 sm:px-6"
            >
              <div className="flex flex-col gap-2 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    {copy.vendor}
                  </p>
                  <h4 className="text-base font-bold text-neutral-900">
                    {vendorOrder.storeName ?? copy.vendor}
                  </h4>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {deliveryMethodLabel(vendorOrder.deliveryMethod, copy)}
                  </p>
                </div>
                <span className="inline-flex w-fit border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-700">
                  {GUEST_VENDOR_STATUS_LABELS[facingStatus]?.[locale] ?? facingStatus}
                </span>
              </div>

              {showTracking ? (
                <div className="mt-4 rounded-lg border border-[#0F3460]/15 bg-[#0F3460]/5 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#0F3460]">
                    {copy.trackingNumber}
                  </p>
                  {trackingNumber ? (
                    <p className="mt-1 font-mono text-base font-bold text-neutral-900">
                      {trackingNumber}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-neutral-600">{copy.trackingPending}</p>
                  )}
                </div>
              ) : null}

              <ul className="divide-y divide-neutral-100">
                {vendorOrder.items.map((item, itemIndex) => (
                  <li
                    key={`${item.productName}-${itemIndex}`}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-neutral-50">
                      {item.productImage ? (
                        <CatalogImage
                          src={item.productImage}
                          alt={item.productName}
                          fill
                          className="object-contain p-1"
                          sizes="56px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-300">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {item.productName}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {copy.qty}: {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-neutral-900">
                      {formatMoney(item.lineTotalAmount, item.currency, locale)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>{copy.subtotal}</span>
                  <span>{formatMoney(vendorOrder.subtotalAmount, vendorOrder.currency, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{copy.delivery}</span>
                  <span>{formatMoney(vendorOrder.deliveryAmount, vendorOrder.currency, locale)}</span>
                </div>
                {vendorOrder.discountAmount > 0 ? (
                  <div className="flex justify-between">
                    <span>{copy.discount}</span>
                    <span>
                      −{formatMoney(vendorOrder.discountAmount, vendorOrder.currency, locale)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-1 font-semibold text-neutral-900">
                  <span>{copy.orderTotal}</span>
                  <span>
                    {formatMoney(vendorOrder.grandTotalAmount, vendorOrder.currency, locale)}
                  </span>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border border-neutral-200/80 bg-white px-5 py-4 text-sm sm:flex-row sm:items-center sm:px-6">
        <p className="text-neutral-600">{copy.accountPrompt}</p>
        <Link
          href={signupHref}
          className="shrink-0 font-semibold text-[#0F3460] underline-offset-4 hover:underline"
        >
          {copy.accountCta}
        </Link>
      </div>

      {showLookupPrompt ? (
        <p className="text-center text-sm text-neutral-500">
          <Link href="/orders" className="font-medium text-[#0F3460] hover:underline">
            {copy.anotherOrder}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
