"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AlertTriangle, ImagePlus, Info, Loader2, Package, Trash2 } from "lucide-react";

import {
  SUPPLY_IMAGE_ACCEPT,
  MAX_SUPPLY_IMAGE_MB,
} from "@/lib/supply/supply-request-media.constants";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/constants";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

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

type SupplyRequestQuoteFields = {
  id: string;
  requestNumber: string;
  status: SupplyRequestStatus;
  budgetMaxMinor: number | null;
  budgetCurrency: string | null;
  allowAlternatives: boolean;
  quoteAmountMinor: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteImageUrl: string | null;
  quoteSentAt: string | null;
  quoteExpiresAt: string | null;
  paidAt: string | null;
  paidAmountMinor: number | null;
  paymentMethod: string | null;
  offlinePaymentNote: string | null;
  rejectReason: string | null;
  trackingRef: string | null;
  carrierNote: string | null;
  shippedAt: string | null;
  refundedAt: string | null;
  refundAmountMinor: number | null;
  refundNote: string | null;
  adminNote: string | null;
};

type AdminSupplyRequestQuoteFormProps = {
  request: SupplyRequestQuoteFields;
  onUpdated: (next: Partial<SupplyRequestQuoteFields> & { id: string }) => void;
};

function formatMoney(amountMinor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100);
}

const CLOSED_STATUSES: SupplyRequestStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "EXPIRED",
];

export function AdminSupplyRequestQuoteForm({
  request,
  onUpdated,
}: AdminSupplyRequestQuoteFormProps) {
  const t = useTranslations("AdminPages.supplyRequests.quote");
  const locale = useLocale();

  // Quote state
  const [amount, setAmount] = useState(
    request.quoteAmountMinor ? String(request.quoteAmountMinor / 100) : ""
  );
  const [currency, setCurrency] = useState(request.quoteCurrency ?? "USD");
  const [quoteNote, setQuoteNote] = useState(request.quoteNote ?? "");
  const [quoteImageUrl, setQuoteImageUrl] = useState(request.quoteImageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  // Mark offline paid state
  const [markingPaid, setMarkingPaid] = useState(false);
  const [offlineNote, setOfflineNote] = useState(request.offlinePaymentNote ?? "");

  // Reject state
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Ship state
  const [trackingRef, setTrackingRef] = useState(request.trackingRef ?? "");
  const [carrierNote, setCarrierNote] = useState(request.carrierNote ?? "");
  const [shipping, setShipping] = useState(false);

  // Refund state
  const [refundAmount, setRefundAmount] = useState(
    request.refundAmountMinor ? String(request.refundAmountMinor / 100) : ""
  );
  const [refundNote, setRefundNote] = useState(request.refundNote ?? "");
  const [refunding, setRefunding] = useState(false);

  // Request-info state
  const [infoMessage, setInfoMessage] = useState(request.adminNote ?? "");
  const [requestingInfo, setRequestingInfo] = useState(false);

  const isClosed = CLOSED_STATUSES.includes(request.status);
  const canSendQuote = !isClosed && !request.paidAt;
  const canMarkOfflinePaid =
    request.status === "AWAITING_PAYMENT" && !request.paidAt && !!request.quoteAmountMinor;
  const canReject = !isClosed && !request.paidAt;
  const canShip =
    !!request.paidAt &&
    !["COMPLETED", "CANCELLED"].includes(request.status);
  const canRefund = !!request.paidAt;
  const canRequestInfo = !isClosed && !request.paidAt;

  const amountPreview = useMemo(() => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return formatMoney(Math.round(parsed * 100), currency, locale);
  }, [amount, currency, locale]);

  const quoteBudgetWarning = useMemo(() => {
    if (!request.budgetMaxMinor || !request.budgetCurrency) return null;
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    const amountMinor = Math.round(parsed * 100);
    if (currency !== request.budgetCurrency) return null;
    if (amountMinor > request.budgetMaxMinor) {
      return t("budgetWarning", {
        budget: formatMoney(request.budgetMaxMinor, request.budgetCurrency, locale),
      });
    }
    return null;
  }, [amount, currency, request.budgetMaxMinor, request.budgetCurrency, locale, t]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("requestId", request.id);

      const response = await fetchWithAuth("/api/admin/supply-requests/upload", {
        method: "POST",
        body: form,
      });
      const data = await parseApiResponse<{ url: string }>(response);
      setQuoteImageUrl(data.url);
      toast.success(t("imageUploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleSendQuote = async () => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(t("invalidAmount"));
      return;
    }

    setSending(true);
    try {
      const response = await fetchWithAuth(
        `/api/admin/supply-requests/${request.id}/quote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteAmountMinor: Math.round(parsed * 100),
            quoteCurrency: currency,
            quoteNote: quoteNote.trim() || undefined,
            quoteImageUrl: quoteImageUrl || undefined,
          }),
        }
      );
      const updated = await parseApiResponse<SupplyRequestQuoteFields>(response);
      onUpdated(updated);
      toast.success(t("sent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const handleMarkOfflinePaid = async () => {
    setMarkingPaid(true);
    try {
      const response = await fetchWithAuth(
        `/api/admin/supply-requests/${request.id}/mark-paid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offlinePaymentNote: offlineNote.trim() || undefined }),
        }
      );
      const updated = await parseApiResponse<SupplyRequestQuoteFields>(response);
      onUpdated(updated);
      toast.success(t("markedPaid"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("markPaidFailed"));
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(t("rejectReasonRequired"));
      return;
    }
    setRejecting(true);
    try {
      const response = await fetchWithAuth(
        `/api/admin/supply-requests/${request.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectReason: rejectReason.trim() }),
        }
      );
      const updated = await parseApiResponse<SupplyRequestQuoteFields>(response);
      onUpdated(updated);
      toast.success(t("rejected"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("rejectFailed"));
    } finally {
      setRejecting(false);
    }
  };

  const handleShip = async () => {
    if (!trackingRef.trim()) {
      toast.error(t("trackingRequired"));
      return;
    }
    setShipping(true);
    try {
      const response = await fetchWithAuth(
        `/api/admin/supply-requests/${request.id}/ship`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackingRef: trackingRef.trim(),
            carrierNote: carrierNote.trim() || undefined,
          }),
        }
      );
      const updated = await parseApiResponse<SupplyRequestQuoteFields>(response);
      onUpdated(updated);
      toast.success(t("shipped"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("shipFailed"));
    } finally {
      setShipping(false);
    }
  };

  const handleRefund = async () => {
    const parsed = Number.parseFloat(refundAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(t("invalidRefundAmount"));
      return;
    }
    if (!refundNote.trim()) {
      toast.error(t("refundNoteRequired"));
      return;
    }
    setRefunding(true);
    try {
      const response = await fetchWithAuth(
        `/api/admin/supply-requests/${request.id}/refund`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refundAmountMinor: Math.round(parsed * 100),
            refundNote: refundNote.trim(),
          }),
        }
      );
      const updated = await parseApiResponse<SupplyRequestQuoteFields>(response);
      onUpdated(updated);
      toast.success(t("refunded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("refundFailed"));
    } finally {
      setRefunding(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!infoMessage.trim()) {
      toast.error(t("infoMessageRequired"));
      return;
    }
    setRequestingInfo(true);
    try {
      const response = await fetchWithAuth(
        `/api/admin/supply-requests/${request.id}/request-info`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: infoMessage.trim() }),
        }
      );
      const updated = await parseApiResponse<SupplyRequestQuoteFields>(response);
      onUpdated(updated);
      toast.success(t("infoRequested"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("infoRequestFailed"));
    } finally {
      setRequestingInfo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alternatives warning */}
      {!request.allowAlternatives ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>{t("noAlternativesReminder")}</p>
        </div>
      ) : null}

      {/* Payment received banner */}
      {request.paidAt && request.paidAmountMinor && request.quoteCurrency ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">
            {t("paid", {
              amount: formatMoney(
                request.paidAmountMinor,
                request.quoteCurrency,
                locale
              ),
            })}
            {request.paymentMethod ? ` · ${request.paymentMethod}` : ""}
          </p>
          {request.offlinePaymentNote ? (
            <p className="mt-1 text-emerald-800">{request.offlinePaymentNote}</p>
          ) : null}
        </div>
      ) : null}

      {/* Rejection banner */}
      {request.rejectReason ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">{t("rejectedWith")}</p>
          <p className="mt-1 text-red-800">{request.rejectReason}</p>
        </div>
      ) : null}

      {/* Refund banner */}
      {request.refundedAt && request.refundAmountMinor && request.quoteCurrency ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <p className="font-semibold">
            {t("refundedWith", {
              amount: formatMoney(request.refundAmountMinor, request.quoteCurrency, locale),
            })}
          </p>
          {request.refundNote ? (
            <p className="mt-1 text-orange-800">{request.refundNote}</p>
          ) : null}
        </div>
      ) : null}

      {/* Shipping info */}
      {request.trackingRef ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">
            <Package className="mr-1.5 inline h-4 w-4" />
            {t("trackingLabel")}: {request.trackingRef}
          </p>
          {request.carrierNote ? (
            <p className="mt-1 text-blue-800">{request.carrierNote}</p>
          ) : null}
        </div>
      ) : null}

      {/* Existing quote image */}
      {request.quoteImageUrl && !canSendQuote ? (
        <div className="relative aspect-[4/3] max-w-xs overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <Image
            src={request.quoteImageUrl}
            alt={t("previewAlt")}
            fill
            className="object-cover"
            sizes="320px"
          />
        </div>
      ) : null}

      {/* Send quote section */}
      {canSendQuote ? (
        <section className="rounded-xl border border-secondary/15 bg-secondary/5 p-4">
          <h3 className="text-sm font-semibold text-neutral-900">{t("title")}</h3>
          <p className="mt-1 text-xs text-neutral-600">{t("subtitle")}</p>

          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">
                  {t("amount")}
                </span>
                <input
                  type="number"
                  min="0.5"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
                  placeholder={t("amountPlaceholder")}
                />
              </label>
              <label className="block sm:w-28">
                <span className="mb-1 block text-xs font-medium text-neutral-500">
                  {t("currency")}
                </span>
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
                >
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {amountPreview ? (
              <p className="text-sm font-medium text-neutral-700">
                {t("customerPays", { amount: amountPreview })}
              </p>
            ) : null}

            {quoteBudgetWarning ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                {quoteBudgetWarning}
              </div>
            ) : null}

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-500">
                {t("note")}
              </span>
              <textarea
                value={quoteNote}
                onChange={(event) => setQuoteNote(event.target.value)}
                className="min-h-[88px] w-full rounded-lg border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
                placeholder={t("notePlaceholder")}
              />
            </label>

            <div>
              <span className="mb-2 block text-xs font-medium text-neutral-500">
                {t("photo")}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploading ? t("uploading") : t("uploadPhoto")}
                  <input
                    type="file"
                    accept={SUPPLY_IMAGE_ACCEPT}
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => void handleImageUpload(event)}
                  />
                </label>
                {quoteImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setQuoteImageUrl("")}
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("remove")}
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {t("photoHint", { mb: MAX_SUPPLY_IMAGE_MB })}
              </p>
            </div>

            {quoteImageUrl ? (
              <div className="relative aspect-[4/3] max-w-xs overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <Image
                  src={quoteImageUrl}
                  alt={t("newPreviewAlt")}
                  fill
                  className="object-cover"
                  sizes="320px"
                />
              </div>
            ) : null}

            <button
              type="button"
              disabled={sending || uploading}
              onClick={() => void handleSendQuote()}
              className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {request.quoteSentAt ? t("resend") : t("send")}
            </button>
          </div>
        </section>
      ) : null}

      {/* Mark offline paid section */}
      {canMarkOfflinePaid ? (
        <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-sm font-semibold text-emerald-900">{t("offlineTitle")}</h3>
          <p className="text-xs text-emerald-800">{t("offlineHelp")}</p>
          <input
            value={offlineNote}
            onChange={(event) => setOfflineNote(event.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
            placeholder={t("offlineNotePlaceholder")}
          />
          <button
            type="button"
            disabled={markingPaid}
            onClick={() => void handleMarkOfflinePaid()}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            {markingPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("markPaid")}
          </button>
        </section>
      ) : null}

      {/* Ship section */}
      {canShip ? (
        <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900">{t("shipTitle")}</h3>
          <input
            value={trackingRef}
            onChange={(event) => setTrackingRef(event.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
            placeholder={t("trackingRefPlaceholder")}
          />
          <input
            value={carrierNote}
            onChange={(event) => setCarrierNote(event.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
            placeholder={t("carrierNotePlaceholder")}
          />
          <button
            type="button"
            disabled={shipping}
            onClick={() => void handleShip()}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:opacity-60"
          >
            {shipping ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("ship")}
          </button>
        </section>
      ) : null}

      {/* Refund section */}
      {canRefund ? (
        <section className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <h3 className="text-sm font-semibold text-orange-900">{t("refundTitle")}</h3>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
              placeholder={t("refundAmountPlaceholder")}
            />
          </div>
          <textarea
            value={refundNote}
            onChange={(event) => setRefundNote(event.target.value)}
            className="min-h-[72px] w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
            placeholder={t("refundNotePlaceholder")}
          />
          <button
            type="button"
            disabled={refunding}
            onClick={() => void handleRefund()}
            className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-white px-4 py-2.5 text-sm font-semibold text-orange-800 transition hover:bg-orange-100 disabled:opacity-60"
          >
            {refunding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("refund")}
          </button>
        </section>
      ) : null}

      {/* Request info section */}
      {canRequestInfo ? (
        <section className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h3 className="text-sm font-semibold text-neutral-900">{t("requestInfoTitle")}</h3>
          <p className="text-xs text-neutral-600">{t("requestInfoHelp")}</p>
          <textarea
            value={infoMessage}
            onChange={(event) => setInfoMessage(event.target.value)}
            className="min-h-[88px] w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
            placeholder={t("requestInfoPlaceholder")}
          />
          <button
            type="button"
            disabled={requestingInfo}
            onClick={() => void handleRequestInfo()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-60"
          >
            {requestingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("sendInfoRequest")}
          </button>
        </section>
      ) : null}

      {/* Reject section */}
      {canReject ? (
        <section className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-900">{t("rejectTitle")}</h3>
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            className="min-h-[72px] w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10"
            placeholder={t("rejectReasonPlaceholder")}
          />
          <button
            type="button"
            disabled={rejecting}
            onClick={() => void handleReject()}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-60"
          >
            {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("reject")}
          </button>
        </section>
      ) : null}
    </div>
  );
}
