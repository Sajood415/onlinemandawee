"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle, Loader2, Package, RefreshCw, XCircle } from "lucide-react";

import { SupplyRequestQuotePayment } from "@/components/customer/SupplyRequestQuotePayment";
import { Link } from "@/i18n/navigation";

type SupplyRequestStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "AWAITING_PAYMENT"
  | "IN_PROGRESS"
  | "SHIPPED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

type TrackedSupplyRequest = {
  id: string;
  requestNumber: string;
  status: SupplyRequestStatus;
  productName: string;
  brand: string | null;
  modelSku: string | null;
  quantity: number;
  description: string;
  deliveryMode: "SHIP" | "PICKUP";
  customerName: string;
  city: string;
  province: string | null;
  neededByDate: string | null;
  allowAlternatives: boolean;
  quoteAmountMinor: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteImageUrl: string | null;
  quoteExpiresAt: string | null;
  paidAt: string | null;
  paidAmountMinor: number | null;
  paymentMethod: string | null;
  rejectReason: string | null;
  trackingRef: string | null;
  carrierNote: string | null;
  shippedAt: string | null;
  refundedAt: string | null;
  refundAmountMinor: number | null;
  refundNote: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<SupplyRequestStatus, string> = {
  SUBMITTED: "bg-amber-50 text-amber-700 border border-amber-200",
  REVIEWING: "bg-sky-50 text-sky-700 border border-sky-200",
  AWAITING_PAYMENT: "bg-orange-50 text-orange-700 border border-orange-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
  SHIPPED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  REJECTED: "bg-red-50 text-red-700 border border-red-200",
  CANCELLED: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  EXPIRED: "bg-neutral-50 text-neutral-500 border border-neutral-200",
};

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100);
}

type SupplyRequestTrackProps = {
  token: string;
};

export function SupplyRequestTrack({ token }: SupplyRequestTrackProps) {
  const t = useTranslations("SupplyPages.track");
  const locale = useLocale();

  const [request, setRequest] = useState<TrackedSupplyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const loadRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/supply-requests/track?token=${encodeURIComponent(token)}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? t("loadError"));
      }
      setRequest(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(
        `/api/supply-requests/track/${encodeURIComponent(token)}/cancel`,
        { method: "POST" }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? t("cancelError"));
      }
      setRequest(data.data);
      setShowCancelConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cancelError"));
    } finally {
      setCancelling(false);
    }
  };

  const canCancel =
    !!request &&
    !request.paidAt &&
    ["SUBMITTED", "REVIEWING", "AWAITING_PAYMENT"].includes(request.status);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f3460]/40" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h1 className="text-xl font-bold text-neutral-900">{t("notFound")}</h1>
        <p className="mt-2 text-sm text-neutral-600">{error ?? t("notFoundHint")}</p>
        <Link
          href="/supply-request"
          className="mt-6 inline-flex bg-[#0F3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
        >
          {t("newRequest")}
        </Link>
      </div>
    );
  }

  const isCompleted = request.status === "COMPLETED";
  const isRejectedOrCancelled = ["REJECTED", "CANCELLED"].includes(request.status);
  const isExpired = request.status === "EXPIRED";

  return (
    <div className="w-full bg-neutral-50 pb-16">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-6 sm:px-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#0f3460]/15 bg-[#0f3460]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f3460]">
          <Package className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 py-8 sm:px-8">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          {/* Request header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-lg font-bold text-[#0f3460]">
                {request.requestNumber}
              </p>
              <p className="mt-0.5 text-sm text-neutral-600">{request.productName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[request.status]}`}
              >
                {t(`status.${request.status}`)}
              </span>
              <button
                type="button"
                onClick={() => void loadRequest()}
                className="rounded-lg border border-neutral-200 p-2 text-neutral-500 transition hover:bg-neutral-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Info message from admin */}
          {request.adminNote ? (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <p className="font-semibold">{t("adminNote")}</p>
              <p className="mt-1 whitespace-pre-wrap">{request.adminNote}</p>
            </div>
          ) : null}

          {/* Quote / payment section */}
          {request.status === "AWAITING_PAYMENT" &&
          request.quoteAmountMinor &&
          request.quoteCurrency ? (
            <div className="mt-5">
              <SupplyRequestQuotePayment
                requestId={request.id}
                requestNumber={request.requestNumber}
                quoteAmountMinor={request.quoteAmountMinor}
                quoteCurrency={request.quoteCurrency}
                quoteNote={request.quoteNote}
                quoteImageUrl={request.quoteImageUrl}
                intentUrl={`/api/supply-requests/track/${encodeURIComponent(token)}/payment/intent`}
                confirmUrl={`/api/supply-requests/track/${encodeURIComponent(token)}/payment/confirm`}
                paypalCreateOrderUrl={`/api/supply-requests/track/${encodeURIComponent(token)}/payment/paypal/create-order`}
                paypalCaptureUrl={`/api/supply-requests/track/${encodeURIComponent(token)}/payment/paypal/capture`}
                onPaid={() => void loadRequest()}
              />
              {request.quoteExpiresAt ? (
                <p className="mt-2 text-xs text-neutral-500">
                  {t("quoteExpiry", {
                    date: new Date(request.quoteExpiresAt).toLocaleString(locale),
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Paid confirmation */}
          {request.paidAt && request.paidAmountMinor && request.quoteCurrency ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">
                  {t("paymentReceived", {
                    amount: formatMoney(request.paidAmountMinor, request.quoteCurrency),
                  })}
                </p>
                <p className="mt-1 text-emerald-800">
                  {new Date(request.paidAt).toLocaleString(locale)}
                </p>
              </div>
            </div>
          ) : null}

          {/* Tracking info */}
          {request.trackingRef ? (
            <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
              <p className="font-semibold">
                <Package className="mr-1.5 inline h-4 w-4" />
                {t("trackingRef")}: {request.trackingRef}
              </p>
              {request.carrierNote ? (
                <p className="mt-1 text-indigo-800">{request.carrierNote}</p>
              ) : null}
              {request.shippedAt ? (
                <p className="mt-1 text-indigo-800">
                  {t("shippedAt", {
                    date: new Date(request.shippedAt).toLocaleString(locale),
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Completed */}
          {isCompleted ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">{t("completedTitle")}</p>
                <p className="mt-1 text-emerald-800">{t("completedBody")}</p>
              </div>
            </div>
          ) : null}

          {/* Rejected */}
          {request.status === "REJECTED" && request.rejectReason ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-semibold">{t("rejectedTitle")}</p>
              <p className="mt-1 text-red-800">{request.rejectReason}</p>
            </div>
          ) : null}

          {/* Cancelled */}
          {request.status === "CANCELLED" ? (
            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-100 p-4 text-sm text-neutral-700">
              <p className="font-semibold">{t("cancelledTitle")}</p>
            </div>
          ) : null}

          {/* Expired */}
          {isExpired ? (
            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-100 p-4 text-sm text-neutral-700">
              <p className="font-semibold">{t("expiredTitle")}</p>
              <p className="mt-1">{t("expiredBody")}</p>
            </div>
          ) : null}

          {/* Refund */}
          {request.refundedAt && request.refundAmountMinor && request.quoteCurrency ? (
            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
              <p className="font-semibold">
                {t("refundedAmount", {
                  amount: formatMoney(request.refundAmountMinor, request.quoteCurrency),
                })}
              </p>
              {request.refundNote ? (
                <p className="mt-1 text-orange-800">{request.refundNote}</p>
              ) : null}
            </div>
          ) : null}

          {/* Request summary */}
          <div className="mt-5 space-y-3 border-t border-neutral-100 pt-5">
            <h2 className="text-sm font-semibold text-neutral-800">{t("summaryTitle")}</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {t("product")}
                </p>
                <p className="mt-1 text-neutral-800">
                  {request.productName}
                  {request.brand ? ` · ${request.brand}` : ""}
                  {request.modelSku ? ` · ${request.modelSku}` : ""}
                </p>
                <p className="text-xs text-neutral-500">×{request.quantity}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {t("delivery")}
                </p>
                <p className="mt-1 text-neutral-800">
                  {t(`deliveryModes.${request.deliveryMode}`)}
                </p>
                <p className="text-xs text-neutral-500">
                  {request.city}
                  {request.province ? `, ${request.province}` : ""}
                </p>
              </div>
              {request.neededByDate ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    {t("neededBy")}
                  </p>
                  <p className="mt-1 text-neutral-800">{request.neededByDate}</p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {t("submitted")}
                </p>
                <p className="mt-1 text-neutral-800">
                  {new Date(request.createdAt).toLocaleString(locale)}
                </p>
              </div>
            </div>
          </div>

          {/* Cancel button */}
          {canCancel ? (
            <div className="mt-5 border-t border-neutral-100 pt-5">
              {showCancelConfirm ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-900">{t("cancelConfirmTitle")}</p>
                  <p className="mt-1 text-sm text-red-800">{t("cancelConfirmBody")}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => void handleCancel()}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t("confirmCancel")}
                    </button>
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => setShowCancelConfirm(false)}
                      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                    >
                      {t("keepRequest")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
                >
                  {t("cancelRequest")}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
