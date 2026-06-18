"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import type { RefundCaseDetail } from "@/components/refunds/refund-types";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

type AdminRefundDecisionFormProps = {
  refundCase: RefundCaseDetail;
  onSuccess: () => void;
};

export function AdminRefundDecisionForm({ refundCase, onSuccess }: AdminRefundDecisionFormProps) {
  const [decisionType, setDecisionType] = useState<"APPROVE" | "REJECT" | "PARTIAL">("APPROVE");
  const [approvedAmount, setApprovedAmount] = useState(refundCase.requestedAmount);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const amountMinor =
        decisionType === "REJECT"
          ? 0
          : decisionType === "APPROVE"
            ? refundCase.requestedAmount
            : approvedAmount;

      await fetchWithAuth(`/api/refunds/${refundCase.id}/admin-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionType,
          approvedAmount: amountMinor,
          reason: reason.trim() || undefined,
        }),
      });
      toast.success("Decision recorded");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record decision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
      <h3 className="text-sm font-semibold text-neutral-900">Admin decision</h3>
      <div className="flex flex-wrap gap-2">
        {(["APPROVE", "PARTIAL", "REJECT"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setDecisionType(option)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              decisionType === option ? "bg-primary text-white" : "border border-neutral-300 text-neutral-700"
            }`}
          >
            {option === "APPROVE" ? "Approve full" : option === "PARTIAL" ? "Partial" : "Reject"}
          </button>
        ))}
      </div>

      {decisionType === "PARTIAL" ? (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Approved amount
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
          Decision note
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
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Submit decision
      </button>
    </div>
  );
}
