"use client";

import { Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { RefundCaseDetail } from "@/components/refunds/refund-types";
import { formatRefundMoney } from "@/components/refunds/format-refund-money";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

type AdminRefundDecisionFormProps = {
  refundCase: RefundCaseDetail;
  onSuccess: () => void;
  locale: string;
};

export function AdminRefundDecisionForm({
  refundCase,
  onSuccess,
  locale,
}: AdminRefundDecisionFormProps) {
  const t = useTranslations("Disputes.adminDecision");
  const [decisionType, setDecisionType] = useState<"APPROVE" | "REJECT" | "PARTIAL">("APPROVE");
  const [approvedAmount, setApprovedAmount] = useState(refundCase.requestedAmount);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const amountMinor = useMemo(() => {
    if (decisionType === "REJECT") return 0;
    if (decisionType === "APPROVE") return refundCase.requestedAmount;
    return approvedAmount;
  }, [approvedAmount, decisionType, refundCase.requestedAmount]);

  const confirmBody = useMemo(() => {
    const amount = formatRefundMoney(amountMinor, refundCase.order.currency, locale);
    if (decisionType === "REJECT") return t("confirmBodyReject");
    if (decisionType === "PARTIAL") return t("confirmBodyPartial", { amount });
    return t("confirmBodyApprove", { amount });
  }, [amountMinor, decisionType, locale, refundCase.order.currency, t]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const resolvedDecisionType =
        decisionType === "PARTIAL" && amountMinor >= refundCase.requestedAmount
          ? "APPROVE"
          : decisionType;

      const response = await fetchWithAuth(`/api/refunds/${refundCase.id}/admin-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionType: resolvedDecisionType,
          approvedAmount: amountMinor,
          reason: reason.trim() || undefined,
        }),
      });
      await parseApiResponse(response);
      toast.success(t("success"));
      setConfirmOpen(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900">{t("title")}</h3>
        <div className="flex flex-wrap gap-2">
          {(["APPROVE", "PARTIAL", "REJECT"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDecisionType(option)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                decisionType === option
                  ? "bg-[#0f3460] text-white"
                  : "border border-neutral-300 text-neutral-700"
              }`}
            >
              {option === "APPROVE"
                ? t("approveFull")
                : option === "PARTIAL"
                  ? t("partial")
                  : t("reject")}
            </button>
          ))}
        </div>

        {decisionType === "PARTIAL" ? (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t("approvedAmount")}
            </label>
            <input
              type="number"
              min={1}
              max={Math.round(refundCase.requestedAmount / 100)}
              value={Math.round(approvedAmount / 100)}
              onChange={(event) =>
                setApprovedAmount(
                  Math.min(refundCase.requestedAmount, Number(event.target.value) * 100)
                )
              }
              className={INPUT_CLASS}
            />
          </div>
        ) : null}

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {t("note")}
          </label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className={INPUT_CLASS}
          />
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-50"
        >
          {t("submit")}
        </button>
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setConfirmOpen(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-decision-confirm-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="admin-decision-confirm-title"
                  className="text-lg font-semibold text-neutral-900"
                >
                  {t("confirmTitle")}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">{confirmBody}</p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-60"
                aria-label={t("confirmCancel")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {t("confirmCancel")}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? t("submitting") : t("confirmYes")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
