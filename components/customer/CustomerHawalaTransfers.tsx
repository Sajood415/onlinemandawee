"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Banknote, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";

import { useCustomerRouteGuard } from "@/components/customer/use-customer-route-guard";
import { PageLoader } from "@/components/ui/PageLoader";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type HawalaTransferStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type CustomerHawalaTransfer = {
  id: string;
  transferNumber: string;
  status: HawalaTransferStatus;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  receiverCountry: string;
  receiverAddress: string;
  sendAmountMinor: number;
  sendCurrency: string;
  receiveAmountMinor: number;
  receiveCurrency: string;
  exchangeRate: number;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<HawalaTransferStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  APPROVED: "bg-sky-50 text-sky-700 border border-sky-200",
  REJECTED: "bg-red-50 text-red-700 border border-red-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
  DELIVERED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  FAILED: "bg-red-50 text-red-700 border border-red-200",
  CANCELLED: "bg-neutral-100 text-neutral-600 border border-neutral-200",
};

function formatMoney(amountMinor: number, currency: string) {
  return `${(amountMinor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function TransferCard({ transfer }: { transfer: CustomerHawalaTransfer }) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("Account.hawala");
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
              {transfer.transferNumber}
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[transfer.status]}`}
            >
              {t(`status.${transfer.status}`)}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-neutral-900">
            {t("receiver")}: {transfer.receiverName}
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            {t("submitted", {
              date: new Date(transfer.createdAt).toLocaleString(locale),
            })}
          </p>
          <p className="mt-1 text-xs font-semibold text-neutral-700">
            {formatMoney(transfer.sendAmountMinor, transfer.sendCurrency)} →{" "}
            {formatMoney(transfer.receiveAmountMinor, transfer.receiveCurrency)}
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
                {t("sender")}
              </p>
              <p className="mt-1 text-sm text-neutral-800">
                {transfer.senderName} · {transfer.senderPhone}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("receiver")}
              </p>
              <p className="mt-1 text-sm text-neutral-800">
                {transfer.receiverName} · {transfer.receiverPhone}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {transfer.receiverAddress}, {transfer.receiverCountry}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("exchangeRate")}
              </p>
              <p className="mt-1 text-sm text-neutral-800">
                1 {transfer.sendCurrency} ≈{" "}
                {transfer.exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                {transfer.receiveCurrency}
              </p>
            </div>
          </div>

          {transfer.note ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t("note")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                {transfer.note}
              </p>
            </div>
          ) : null}

          {transfer.adminNote ? (
            <div className="rounded-xl border border-[#0f3460]/15 bg-[#0f3460]/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0f3460]">
                {t("adminNote")}
              </p>
              <p className="mt-1 text-sm text-neutral-700">{transfer.adminNote}</p>
            </div>
          ) : null}

          {transfer.updatedAt !== transfer.createdAt ? (
            <p className="text-xs text-neutral-500">
              {t("lastUpdated", {
                date: new Date(transfer.updatedAt).toLocaleString(locale),
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function CustomerHawalaTransfers() {
  const { isLoading: guardLoading } = useCustomerRouteGuard();
  const t = useTranslations("Account.hawala");
  const tc = useTranslations("Common");

  const [transfers, setTransfers] = useState<CustomerHawalaTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/api/customer/hawala");
      const data = await parseApiResponse<CustomerHawalaTransfer[]>(response);
      setTransfers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!guardLoading) {
      void loadTransfers();
    }
  }, [guardLoading, loadTransfers]);

  if (guardLoading) {
    return <PageLoader message={tc("checkingAccount")} fullScreen />;
  }

  return (
    <div className="w-full bg-neutral-50 pb-16">
      <div className="border-b border-neutral-200 bg-white px-6 py-6 sm:px-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#0f3460]/15 bg-[#0f3460]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f3460]">
          <Banknote className="h-3.5 w-3.5" />
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
              {loading ? t("loading") : t("count", { count: transfers.length })}
            </p>
            <button
              type="button"
              onClick={() => void loadTransfers()}
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
          ) : transfers.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center">
              <Banknote className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-900">{t("emptyTitle")}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
                {t("emptyDescription")}
              </p>
              <Link
                href="/hawala"
                className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {t("createTransfer")}
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {transfers.map((transfer) => (
                <TransferCard key={transfer.id} transfer={transfer} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
