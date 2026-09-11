"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Loader2, Package, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { useCustomerRouteGuard } from "@/components/customer/use-customer-route-guard";
import { SupplyRequestQuotePayment } from "@/components/customer/SupplyRequestQuotePayment";
import { PageLoader } from "@/components/ui/PageLoader";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";

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

type CustomerSupplyRequest = {
  id: string;
  requestNumber: string;
  status: SupplyRequestStatus;
  productName: string;
  brand: string | null;
  modelSku: string | null;
  quantity: number;
  description: string;
  referenceUrls: string[] | null;
  imageUrls: string[] | null;
  categoryHint: string | null;
  budgetMinMinor: number | null;
  budgetMaxMinor: number | null;
  budgetCurrency: string | null;
  neededByDate: string | null;
  urgencyNote: string | null;
  allowAlternatives: boolean;
  deliveryMode: "SHIP" | "PICKUP";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  city: string;
  province: string | null;
  address: string;
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

function SupplyRequestCard({
  request,
  onRefresh,
}: {
  request: CustomerSupplyRequest;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const t = useTranslations("Account.supplyRequests");
  const locale = useLocale();

  const canCancel = ["SUBMITTED", "REVIEWING", "AWAITING_PAYMENT"].includes(
    request.status
  );

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetchWithAuth(
        `/api/customer/supply-requests/${request.id}/cancel`,
        { method: "POST" }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message ?? t("cancelError"));
      }
      setConfirmCancel(false);
      onRefresh();
    } catch (err) {
      setConfirmCancel(false);
      alert(err instanceof Error ? err.message : t("cancelError"));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-neutral-100/80"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold text-secondary">
              {request.requestNumber}
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[request.status]}`}
            >
              {t(`status.${request.status}`)}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-neutral-900">
            {request.productName}
            {request.brand ? ` · ${request.brand}` : ""}
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            {t("submitted", {
              date: new Date(request.createdAt).toLocaleString(locale),
            })}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {request.city}
            {request.province ? `, ${request.province}` : ""}
          </p>
        </div>
        <div className="pt-1">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-neutral-200 bg-white px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("quantity")}
              </p>
              <p className="mt-1 text-sm text-neutral-800">×{request.quantity}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("deliveryMode")}
              </p>
              <p className="mt-1 text-sm text-neutral-800">
                {t(`deliveryModes.${request.deliveryMode}`)}
              </p>
            </div>
            {request.neededByDate ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("neededBy")}
                </p>
                <p className="mt-1 text-sm text-neutral-800">{request.neededByDate}</p>
              </div>
            ) : null}
            {(request.budgetMinMinor != null || request.budgetMaxMinor != null) &&
            request.budgetCurrency ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("budget")}
                </p>
                <p className="mt-1 text-sm text-neutral-800">
                  {request.budgetMinMinor != null
                    ? formatMoney(request.budgetMinMinor, request.budgetCurrency)
                    : ""}
                  {request.budgetMinMinor != null && request.budgetMaxMinor != null
                    ? " – "
                    : ""}
                  {request.budgetMaxMinor != null
                    ? formatMoney(request.budgetMaxMinor, request.budgetCurrency)
                    : ""}
                </p>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("deliveryAddress")}
              </p>
              <p className="mt-1 text-sm text-neutral-800">
                {request.address || "—"}, {request.city}
                {request.province ? `, ${request.province}` : ""}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t("description")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {request.description}
            </p>
          </div>

          {/* Reference URLs */}
          {request.referenceUrls && request.referenceUrls.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("referenceUrls")}
              </p>
              <ul className="mt-1 space-y-1">
                {request.referenceUrls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm text-secondary hover:underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Images */}
          {request.imageUrls && request.imageUrls.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("images")}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {request.imageUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover transition hover:scale-105"
                      sizes="120px"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {/* Admin note */}
          {request.adminNote ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                {t("adminNote")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-sky-900">
                {request.adminNote}
              </p>
            </div>
          ) : null}

          {/* Tracking */}
          {request.trackingRef ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                <Package className="mr-1.5 inline h-3.5 w-3.5" />
                {t("tracking")}
              </p>
              <p className="mt-1 text-sm font-mono font-semibold text-indigo-900">
                {request.trackingRef}
              </p>
              {request.carrierNote ? (
                <p className="mt-1 text-sm text-indigo-800">{request.carrierNote}</p>
              ) : null}
            </div>
          ) : null}

          {/* Rejected */}
          {request.status === "REJECTED" && request.rejectReason ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                {t("rejected")}
              </p>
              <p className="mt-1 text-sm text-red-800">{request.rejectReason}</p>
            </div>
          ) : null}

          {/* Refund info */}
          {request.refundedAt && request.refundAmountMinor && request.quoteCurrency ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                {t("refunded")}
              </p>
              <p className="mt-1 text-sm text-orange-900">
                {formatMoney(request.refundAmountMinor, request.quoteCurrency)}
              </p>
              {request.refundNote ? (
                <p className="mt-1 text-sm text-orange-800">{request.refundNote}</p>
              ) : null}
            </div>
          ) : null}

          {/* Quote payment */}
          {request.status === "AWAITING_PAYMENT" &&
          request.quoteAmountMinor &&
          request.quoteCurrency ? (
            <SupplyRequestQuotePayment
              requestId={request.id}
              requestNumber={request.requestNumber}
              quoteAmountMinor={request.quoteAmountMinor}
              quoteCurrency={request.quoteCurrency}
              quoteNote={request.quoteNote}
              quoteImageUrl={request.quoteImageUrl}
              intentUrl={`/api/customer/supply-requests/${request.id}/payment/intent`}
              confirmUrl={`/api/customer/supply-requests/${request.id}/payment/confirm`}
              paypalCreateOrderUrl={`/api/customer/supply-requests/${request.id}/payment/paypal/create-order`}
              paypalCaptureUrl={`/api/customer/supply-requests/${request.id}/payment/paypal/capture`}
              authenticated
              onPaid={onRefresh}
            />
          ) : null}

          {canCancel ? (
            <div className="border-t border-neutral-100 pt-3">
              {confirmCancel ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-900">
                    {t("cancelConfirmTitle")}
                  </p>
                  <p className="mt-1 text-sm text-red-800">{t("cancelConfirmBody")}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => void handleCancel()}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {cancelling ? "…" : t("confirmCancel")}
                    </button>
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => setConfirmCancel(false)}
                      className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700"
                    >
                      {t("keepRequest")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  {t("cancelRequest")}
                </button>
              )}
            </div>
          ) : null}

          {/* Payment received */}
          {request.paidAt && request.paidAmountMinor && request.quoteCurrency ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {t("paymentReceived", {
                amount: formatMoney(request.paidAmountMinor, request.quoteCurrency),
              })}
            </div>
          ) : null}

          {request.updatedAt !== request.createdAt ? (
            <p className="text-xs text-neutral-500">
              {t("lastUpdated", {
                date: new Date(request.updatedAt).toLocaleString(locale),
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function CustomerSupplyRequests() {
  const { isLoading: guardLoading } = useCustomerRouteGuard();
  const t = useTranslations("Account.supplyRequests");
  const tc = useTranslations("Common");

  const [requests, setRequests] = useState<CustomerSupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/api/customer/supply-requests");
      const data = await parseApiResponse<CustomerSupplyRequest[]>(response);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!guardLoading) {
      void loadRequests();
    }
  }, [guardLoading, loadRequests]);

  if (guardLoading) {
    return <PageLoader message={tc("checkingAccount")} fullScreen />;
  }

  return (
    <div className="w-full bg-neutral-50 pb-16">
      <div className="border-b border-neutral-200 bg-white px-6 py-6 sm:px-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-secondary/15 bg-secondary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
          <Package className="h-3.5 w-3.5" />
          {t("badge")}
        </div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8">
        {error ? (
          <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">
              {loading ? t("loading") : t("count", { count: requests.length })}
            </p>
            <button
              type="button"
              onClick={() => void loadRequests()}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <RefreshCw className="h-4 w-4" />
              {tc("refresh")}
            </button>
          </div>

          {loading ? (
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : requests.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-900">{t("emptyTitle")}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
                {t("emptyDescription")}
              </p>
              <Link
                href="/supply-request"
                className="mt-4 inline-flex rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a2847]"
              >
                {t("createRequest")}
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {requests.map((request) => (
                <SupplyRequestCard
                  key={request.id}
                  request={request}
                  onRefresh={loadRequests}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
