"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { RefundCaseDetail, RefundDecisionType } from "@/components/refunds/refund-types";
import { REFUND_DECISION_LABELS } from "@/components/refunds/refund-types";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const DECISION_TYPES = Object.keys(REFUND_DECISION_LABELS) as RefundDecisionType[];

type AdminRefundDecisionEditorProps = {
  refundCase: RefundCaseDetail;
  onSuccess: () => void;
  variant?: "card" | "inline";
};

export function AdminRefundDecisionEditor({
  refundCase,
  onSuccess,
  variant = "card",
}: AdminRefundDecisionEditorProps) {
  const decision = refundCase.decision;
  const [decisionType, setDecisionType] = useState<RefundDecisionType>(
    decision?.decisionType ?? "APPROVE"
  );
  const [approvedAmount, setApprovedAmount] = useState(decision?.approvedAmount ?? 0);
  const [reason, setReason] = useState(decision?.reason ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!decision) return;
    setDecisionType(decision.decisionType);
    setApprovedAmount(decision.approvedAmount);
    setReason(decision.reason ?? "");
  }, [decision]);

  if (!decision) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const amountMinor =
        decisionType === "REJECT"
          ? 0
          : decisionType === "APPROVE"
            ? refundCase.requestedAmount
            : approvedAmount;

      const resolvedDecisionType =
        decisionType === "PARTIAL" && amountMinor >= refundCase.requestedAmount
          ? "APPROVE"
          : decisionType;

      const response = await fetchWithAuth(`/api/admin/refunds/${refundCase.id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionType: resolvedDecisionType,
          approvedAmount: amountMinor,
          reason: reason.trim() || undefined,
        }),
      });
      await parseApiResponse(response);
      toast.success("Decision updated");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update decision");
    } finally {
      setSaving(false);
    }
  };

  const fields = (
    <div className={variant === "inline" ? "space-y-2" : "space-y-3"}>
      <div className={variant === "inline" ? "relative min-w-[12rem]" : "relative"}>
        <select
          value={decisionType}
          disabled={saving}
          onChange={(event) => setDecisionType(event.target.value as RefundDecisionType)}
          aria-label="Decision outcome"
          className={
            variant === "inline"
              ? "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pe-9 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
              : "w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
          }
        >
          {DECISION_TYPES.map((option) => (
            <option key={option} value={option}>
              {REFUND_DECISION_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {decisionType === "PARTIAL" ? (
        <div>
          {variant === "card" ? (
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Approved amount
            </label>
          ) : null}
          <input
            type="number"
            min={1}
            max={Math.round(refundCase.requestedAmount / 100)}
            disabled={saving}
            value={Math.round(approvedAmount / 100)}
            onChange={(event) =>
              setApprovedAmount(
                Math.min(refundCase.requestedAmount, Number(event.target.value) * 100)
              )
            }
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
          />
        </div>
      ) : null}

      {variant === "card" ? (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Decision note
          </label>
          <textarea
            value={reason}
            disabled={saving}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
          />
        </div>
      ) : (
        <input
          type="text"
          value={reason}
          disabled={saving}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Decision note (optional)"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
        />
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className={
          variant === "inline"
            ? "inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            : "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        }
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Save decision
      </button>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-end gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Decision outcome
        </label>
        {fields}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Decision outcome</h3>
      <div className="mt-3">{fields}</div>
      <p className="mt-2 text-xs text-neutral-500">
        Updates the recorded decision only. Stripe payouts are not adjusted automatically.
      </p>
    </div>
  );
}
