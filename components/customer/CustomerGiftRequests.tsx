"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ChevronDown,
  ChevronUp,
  Gift,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { useCustomerRouteGuard } from "@/components/customer/use-customer-route-guard";
import { GiftRequestQuotePayment } from "@/components/customer/GiftRequestQuotePayment";
import { GiftRequestMediaGallery } from "@/components/gifts/GiftRequestMediaGallery";
import { PageLoader } from "@/components/ui/PageLoader";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type GiftRequestStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "AWAITING_PAYMENT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type CustomerGiftRequest = {
  id: string;
  requestNumber: string;
  status: GiftRequestStatus;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  recipientProvince: string | null;
  recipientAddress: string;
  occasion: string | null;
  preferredDeliveryDate: string | null;
  itemType: string | null;
  dressColor: string | null;
  dressSize: string | null;
  dressSleeveType: string | null;
  dressLength: string | null;
  dressFitting: string | null;
  dressTexture: string | null;
  dressForMale: boolean;
  dressForFemale: boolean;
  preparationNotes: string;
  deliveryInstructions: string;
  budgetNote: string | null;
  imageUrls: string[];
  videoUrls: string[];
  quoteAmountMinor: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteImageUrl: string | null;
  paidAt: string | null;
  paidAmountMinor: number | null;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<GiftRequestStatus, string> = {
  SUBMITTED: "bg-amber-50 text-amber-700 border border-amber-200",
  REVIEWING: "bg-sky-50 text-sky-700 border border-sky-200",
  AWAITING_PAYMENT: "bg-orange-50 text-orange-700 border border-orange-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  CANCELLED: "bg-neutral-100 text-neutral-600 border border-neutral-200",
};

function GiftRequestCard({
  request,
  onRefresh,
}: {
  request: CustomerGiftRequest;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("Account.giftRequests");
  const locale = useLocale();

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-neutral-100/80"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold text-[#0f3460]">
              {request.requestNumber}
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[request.status]}`}
            >
              {t(`status.${request.status}`)}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-neutral-900">
            {t("recipient")}: {request.recipientName}
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            {t("submitted", {
              date: new Date(request.createdAt).toLocaleString(locale),
            })}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {request.recipientCity}
            {request.recipientProvince ? `, ${request.recipientProvince}` : ""}
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
                {t("occasion")}
              </p>
              <p className="mt-1 text-sm text-neutral-800">
                {request.occasion ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("preferredDate")}
              </p>
              <p className="mt-1 text-sm text-neutral-800">
                {request.preferredDeliveryDate ?? "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("deliveryAddress")}
              </p>
              <p className="mt-1 text-sm text-neutral-800">
                {request.recipientAddress}, {request.recipientCity}
                {request.recipientProvince ? `, ${request.recipientProvince}` : ""}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {request.recipientName} · {request.recipientPhone}
              </p>
            </div>
          </div>

          {request.itemType === "DRESS" ? (
            <div className="rounded-xl border border-[#0f3460]/15 bg-[#0f3460]/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0f3460]">
                {t("dressDetails")}
              </p>
              <div className="mt-2 grid gap-2 text-sm text-neutral-800 sm:grid-cols-3">
                <p>
                  <span className="text-neutral-500">{t("dressColor")}:</span>{" "}
                  {request.dressColor ?? "—"}
                </p>
                <p>
                  <span className="text-neutral-500">{t("dressSize")}:</span>{" "}
                  {request.dressSize ?? "—"}
                </p>
                <p>
                  <span className="text-neutral-500">{t("dressSleeveType")}:</span>{" "}
                  {request.dressSleeveType ?? "—"}
                </p>
                <p>
                  <span className="text-neutral-500">{t("dressLength")}:</span>{" "}
                  {request.dressLength ?? "—"}
                </p>
                <p>
                  <span className="text-neutral-500">{t("dressFitting")}:</span>{" "}
                  {request.dressFitting ?? "—"}
                </p>
                <p>
                  <span className="text-neutral-500">{t("dressTexture")}:</span>{" "}
                  {request.dressTexture ?? "—"}
                </p>
                <p className="sm:col-span-3">
                  <span className="text-neutral-500">{t("dressGenderLabel")}:</span>{" "}
                  {[
                    request.dressForMale ? t("dressForMale") : null,
                    request.dressForFemale ? t("dressForFemale") : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t("preparation")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {request.preparationNotes}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t("deliveryInstructions")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {request.deliveryInstructions}
            </p>
          </div>

          {request.budgetNote ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("budgetNote")}
              </p>
              <p className="mt-1 text-sm text-neutral-700">{request.budgetNote}</p>
            </div>
          ) : null}

          <GiftRequestMediaGallery
            imageUrls={request.imageUrls}
            videoUrls={request.videoUrls}
            title={t("referenceMedia")}
            imagesLabel={t("images")}
            videosLabel={t("videos")}
          />

          {request.status === "AWAITING_PAYMENT" &&
          request.quoteAmountMinor &&
          request.quoteCurrency ? (
            <GiftRequestQuotePayment
              requestId={request.id}
              requestNumber={request.requestNumber}
              quoteAmountMinor={request.quoteAmountMinor}
              quoteCurrency={request.quoteCurrency}
              quoteNote={request.quoteNote}
              quoteImageUrl={request.quoteImageUrl}
              onPaid={onRefresh}
            />
          ) : null}

          {request.paidAt && request.paidAmountMinor && request.quoteCurrency ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {t("paymentReceived", {
                amount: new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: request.quoteCurrency.toUpperCase(),
                }).format(request.paidAmountMinor / 100),
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

export function CustomerGiftRequests() {
  const { isLoading: guardLoading } = useCustomerRouteGuard();
  const t = useTranslations("Account.giftRequests");
  const tc = useTranslations("Common");

  const [requests, setRequests] = useState<CustomerGiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/api/customer/gift-requests");
      const data = await parseApiResponse<CustomerGiftRequest[]>(response);
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
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#0f3460]/15 bg-[#0f3460]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f3460]">
          <Gift className="h-3.5 w-3.5" />
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
              {loading
                ? t("loading")
                : t("count", { count: requests.length })}
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
              <Gift className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-900">{t("emptyTitle")}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
                {t("emptyDescription")}
              </p>
              <Link
                href="/gifts"
                className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {t("createRequest")}
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {requests.map((request) => (
                <GiftRequestCard key={request.id} request={request} onRefresh={loadRequests} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
