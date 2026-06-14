"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { GIFT_IMAGE_ACCEPT, MAX_GIFT_IMAGE_MB } from "@/lib/gifts/gift-request-media.constants";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/constants";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type GiftRequestQuoteFields = {
  id: string;
  requestNumber: string;
  status:
    | "SUBMITTED"
    | "REVIEWING"
    | "AWAITING_PAYMENT"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
  quoteAmountMinor: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteImageUrl: string | null;
  quoteSentAt: string | null;
  paidAt: string | null;
  paidAmountMinor: number | null;
  paymentMethod: string | null;
  offlinePaymentNote: string | null;
};

type AdminGiftRequestQuoteFormProps = {
  request: GiftRequestQuoteFields;
  onUpdated: (next: GiftRequestQuoteFields) => void;
};

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100);
}

export function AdminGiftRequestQuoteForm({
  request,
  onUpdated,
}: AdminGiftRequestQuoteFormProps) {
  const [amount, setAmount] = useState(
    request.quoteAmountMinor ? String(request.quoteAmountMinor / 100) : ""
  );
  const [currency, setCurrency] = useState(request.quoteCurrency ?? "USD");
  const [quoteNote, setQuoteNote] = useState(request.quoteNote ?? "");
  const [quoteImageUrl, setQuoteImageUrl] = useState(request.quoteImageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [offlineNote, setOfflineNote] = useState(request.offlinePaymentNote ?? "");

  const canSendQuote =
    request.status !== "COMPLETED" &&
    request.status !== "CANCELLED" &&
    !request.paidAt;

  const canMarkOfflinePaid =
    request.status === "AWAITING_PAYMENT" && !request.paidAt && request.quoteAmountMinor;

  const amountPreview = useMemo(() => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return formatMoney(Math.round(parsed * 100), currency);
  }, [amount, currency]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("requestId", request.id);

      const response = await fetchWithAuth("/api/admin/gift-requests/upload", {
        method: "POST",
        body: form,
      });
      const data = await parseApiResponse<{ url: string }>(response);
      setQuoteImageUrl(data.url);
      toast.success("Gift preview uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSendQuote = async () => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid quote amount");
      return;
    }
    if (!quoteImageUrl) {
      toast.error("Upload a gift preview image");
      return;
    }

    setSending(true);
    try {
      const response = await fetchWithAuth(`/api/admin/gift-requests/${request.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteAmountMinor: Math.round(parsed * 100),
          quoteCurrency: currency,
          quoteNote: quoteNote.trim() || undefined,
          quoteImageUrl,
        }),
      });
      const updated = await parseApiResponse<GiftRequestQuoteFields>(response);
      onUpdated(updated);
      toast.success("Quote sent to customer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send quote");
    } finally {
      setSending(false);
    }
  };

  const handleMarkOfflinePaid = async () => {
    setMarkingPaid(true);
    try {
      const response = await fetchWithAuth(
        `/api/admin/gift-requests/${request.id}/mark-paid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offlinePaymentNote: offlineNote.trim() || undefined,
          }),
        }
      );
      const updated = await parseApiResponse<GiftRequestQuoteFields>(response);
      onUpdated(updated);
      toast.success("Marked as paid");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark as paid");
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#0f3460]/15 bg-[#0f3460]/5 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Quote & payment</h3>
      <p className="mt-1 text-xs text-neutral-600">
        Upload a photo of the prepared gift and send the customer a quote with payment details.
      </p>

      {request.paidAt && request.quoteAmountMinor && request.quoteCurrency ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">
            Paid {formatMoney(request.paidAmountMinor ?? request.quoteAmountMinor, request.quoteCurrency)}
            {request.paymentMethod ? ` · ${request.paymentMethod}` : ""}
          </p>
          {request.offlinePaymentNote ? (
            <p className="mt-1 text-emerald-800">{request.offlinePaymentNote}</p>
          ) : null}
        </div>
      ) : null}

      {request.quoteImageUrl ? (
        <div className="relative mt-4 aspect-[4/3] max-w-xs overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <Image
            src={request.quoteImageUrl}
            alt="Gift preview"
            fill
            className="object-cover"
            sizes="320px"
          />
        </div>
      ) : null}

      {canSendQuote ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Quote amount
              </span>
              <input
                type="number"
                min="0.5"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
                placeholder="49.99"
              />
            </label>
            <label className="block sm:w-28">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Currency
              </span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
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
            <p className="text-sm font-medium text-neutral-700">Customer will pay: {amountPreview}</p>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Note for customer (optional)
            </span>
            <textarea
              value={quoteNote}
              onChange={(event) => setQuoteNote(event.target.value)}
              className="min-h-[88px] w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
              placeholder="Includes delivery, packaging, and custom preparation..."
            />
          </label>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Gift preview photo
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Upload gift photo"}
                <input
                  type="file"
                  accept={GIFT_IMAGE_ACCEPT}
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
                  Remove
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              JPG, PNG, or WebP · max {MAX_GIFT_IMAGE_MB} MB
            </p>
          </div>

          {quoteImageUrl && quoteImageUrl !== request.quoteImageUrl ? (
            <div className="relative aspect-[4/3] max-w-xs overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <Image
                src={quoteImageUrl}
                alt="New gift preview"
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
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f3460] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {request.quoteSentAt ? "Resend quote" : "Send quote to customer"}
          </button>
        </div>
      ) : null}

      {canMarkOfflinePaid ? (
        <div className="mt-4 space-y-3 border-t border-[#0f3460]/10 pt-4">
          <p className="text-xs text-neutral-600">
            Customer has not paid online yet. Mark as paid if they paid by bank transfer or cash.
          </p>
          <input
            value={offlineNote}
            onChange={(event) => setOfflineNote(event.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
            placeholder="Offline payment note (optional)"
          />
          <button
            type="button"
            disabled={markingPaid}
            onClick={() => void handleMarkOfflinePaid()}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            {markingPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Mark offline payment received
          </button>
        </div>
      ) : null}
    </section>
  );
}
