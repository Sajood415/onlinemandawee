"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { RefundCaseDetail, RefundCaseStatus } from "@/components/refunds/refund-types";
import { REFUND_STATUS_LABELS } from "@/components/refunds/refund-types";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const REFUND_STATUSES = Object.keys(REFUND_STATUS_LABELS) as RefundCaseStatus[];

type AdminRefundStatusEditorProps = {
  refundCase: RefundCaseDetail;
  onSuccess: () => void;
  variant?: "card" | "inline";
};

export function AdminRefundStatusEditor({
  refundCase,
  onSuccess,
  variant = "card",
}: AdminRefundStatusEditorProps) {
  const [status, setStatus] = useState(refundCase.status);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setStatus(refundCase.status);
  }, [refundCase.status]);

  const handleStatusChange = async (nextStatus: RefundCaseStatus) => {
    if (nextStatus === refundCase.status) {
      return;
    }

    setStatus(nextStatus);
    setUpdating(true);

    try {
      const response = await fetchWithAuth(`/api/admin/refunds/${refundCase.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await parseApiResponse(response);
      toast.success("Dispute status updated");
      onSuccess();
    } catch (error) {
      setStatus(refundCase.status);
      toast.error(error instanceof Error ? error.message : "Could not update status");
    } finally {
      setUpdating(false);
    }
  };

  const select = (
    <div className={variant === "inline" ? "relative min-w-[12rem]" : "relative"}>
      <select
        value={status}
        disabled={updating}
        onChange={(event) =>
          void handleStatusChange(event.target.value as RefundCaseStatus)
        }
        aria-label="Dispute status"
        className={
          variant === "inline"
            ? "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pe-9 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
            : "w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
        }
      >
        {REFUND_STATUSES.map((option) => (
          <option key={option} value={option}>
            {REFUND_STATUS_LABELS[option]}
          </option>
        ))}
      </select>
      {updating ? (
        <Loader2 className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
      ) : null}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-end gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Workflow status
        </label>
        {select}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <label className="mb-2 block text-sm font-semibold text-neutral-900">
        Dispute status
      </label>
      {select}
      <p className="mt-2 text-xs text-neutral-500">
        Override the workflow status when a case is stuck or needs to be reopened.
      </p>
    </div>
  );
}
