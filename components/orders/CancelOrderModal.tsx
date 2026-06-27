"use client";

import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type CancelOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: {
    id: string;
    orderNumber: string;
  };
};

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function CancelOrderModal({
  open,
  onClose,
  onSuccess,
  order,
}: CancelOrderModalProps) {
  const t = useTranslations("Account.overview.orders");
  const tc = useTranslations("Common");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setSubmitting(false);
    }
  }, [open, order.id]);

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetchWithAuth(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
        }),
      });
      await parseApiResponse(response);
      toast.success(t("cancelSuccess"));
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{t("cancelModalTitle")}</h2>
            <p className="mt-1 text-sm text-neutral-600">{order.orderNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
            aria-label={tc("cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-neutral-700">{t("cancelModalDescription")}</p>
          <label className="block text-sm font-medium text-neutral-800">
            {t("cancelReasonLabel")}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("cancelReasonPlaceholder")}
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            {t("cancelModalDismiss")}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? t("cancelling") : t("cancelModalConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
