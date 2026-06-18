"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { ChevronRight, MapPin, Package, Phone, Mail } from "lucide-react";

import {
  GUEST_VENDOR_STATUS_LABELS,
  getGuestOrderTrackingCopy,
} from "@/components/orders/guest-order-tracking-copy";
import type { GuestPublicOrder } from "@/lib/orders/guest-public-order-types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border border-blue-200",
  PREPARING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  SHIPPED: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  DELIVERED: "bg-green-50 text-green-700 border border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
  CREATED: "bg-slate-50 text-slate-700 border border-slate-200",
};

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
  const statuses = order.vendorOrders.map((vendorOrder) => vendorOrder.status);
  if (statuses.every((status) => status === "CANCELLED")) return "CANCELLED";
  if (statuses.every((status) => status === "DELIVERED")) return "DELIVERED";
  if (statuses.some((status) => status === "SHIPPED")) return "SHIPPED";
  if (statuses.some((status) => status === "PREPARING")) return "PREPARING";
  return "NEW";
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
  const signupHref = `/auth/signup?redirect=${encodeURIComponent("/account")}`;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              {copy.placed}{" "}
              {new Intl.DateTimeFormat(locale === "fa-AF" ? "fa-AF" : locale === "ps" ? "ps-AF" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(order.createdAt))}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#0f3460] sm:text-3xl">{order.orderNumber}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {copy.customer}: <span className="font-medium text-slate-800">{order.customerName}</span>
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[summaryStatus] ?? STATUS_COLORS.CREATED}`}
          >
            {GUEST_VENDOR_STATUS_LABELS[summaryStatus]?.[locale] ?? summaryStatus}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{copy.orderTotal}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatMoney(order.grandTotalAmount, order.currency, locale)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{copy.payment}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {order.paymentMethodLabel === "cod" ? copy.cod : copy.cardPaid}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{copy.contact}</p>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              {order.contact.email ? (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <bdi>{order.contact.email}</bdi>
                </p>
              ) : null}
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <bdi>{order.contact.phone}</bdi>
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{copy.delivery}</p>
            <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {order.shippingAddress.addressLine1}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.country}
                {order.shippingAddress.postalCode ? ` ${order.shippingAddress.postalCode}` : ""}
              </span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">{copy.privacyNote}</p>
      </section>

      {order.vendorOrders.map((vendorOrder) => (
        <section
          key={`${vendorOrder.storeName}-${vendorOrder.status}-${vendorOrder.grandTotalAmount}`}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{copy.vendor}</p>
              <h2 className="text-lg font-bold text-slate-900">
                {vendorOrder.storeName ?? copy.vendor}
              </h2>
            </div>
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[vendorOrder.status] ?? STATUS_COLORS.NEW}`}
            >
              {GUEST_VENDOR_STATUS_LABELS[vendorOrder.status]?.[locale] ?? vendorOrder.status}
            </span>
          </div>

          <div className="space-y-3">
            {vendorOrder.items.map((item) => (
              <div
                key={`${item.productName}-${item.quantity}-${item.lineTotalAmount}`}
                className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{item.productName}</p>
                    <p className="text-sm text-slate-500">
                      {copy.qty}: {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-900">
                  {formatMoney(item.lineTotalAmount, item.currency, locale)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>{copy.subtotal}</span>
              <span>{formatMoney(vendorOrder.subtotalAmount, vendorOrder.currency, locale)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>{copy.delivery}</span>
              <span>{formatMoney(vendorOrder.deliveryAmount, vendorOrder.currency, locale)}</span>
            </div>
            {vendorOrder.discountAmount > 0 ? (
              <div className="mt-1 flex justify-between">
                <span>{copy.discount}</span>
                <span>-{formatMoney(vendorOrder.discountAmount, vendorOrder.currency, locale)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between font-semibold text-slate-900">
              <span>{copy.orderTotal}</span>
              <span>{formatMoney(vendorOrder.grandTotalAmount, vendorOrder.currency, locale)}</span>
            </div>
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-[#0f3460]/10 bg-[#0f3460]/5 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#0f3460]">{copy.accountPrompt}</h2>
        <p className="mt-2 text-sm text-slate-600">{copy.lookupHelp}</p>
        <Link
          href={signupHref}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
        >
          {copy.accountCta}
        </Link>
      </section>

      {showLookupPrompt ? (
        <p className="text-center text-sm text-slate-500">
          <Link href="/orders" className="font-medium text-[#0f3460] hover:underline">
            {copy.trackOrder}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function GuestOrderTrackingShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const locale = useLocale() as SupportedLocale;
  const isRtl = locale !== "en";
  const copy = getGuestOrderTrackingCopy(locale);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f8fc]">
      <section className="border-b border-[#0f3460]/10 bg-gradient-to-br from-[#0f3460] via-[#123f74] to-[#0f3460] text-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {copy.home}
            </Link>
            <ChevronRight className={`h-4 w-4 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span className="font-medium text-white">{copy.trackOrder}</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">{subtitle}</p> : null}
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
