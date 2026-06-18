"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { REFUND_REASONS } from "@/components/refunds/refund-types";
import { formatRefundMoney } from "@/components/refunds/format-refund-money";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type RequestRefundModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (refundCaseId: string) => void;
  orderItem: {
    id: string;
    productName: string;
    lineTotalAmount: number;
    currency: string;
  };
  locale: string;
};

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function RequestRefundModal({
  open,
  onClose,
  onSuccess,
  orderItem,
  locale,
}: RequestRefundModalProps) {
  const [reason, setReason] = useState<string>(REFUND_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [description, setDescription] = useState("");
  const [requestedAmount, setRequestedAmount] = useState(orderItem.lineTotalAmount);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceFileUrl, setEvidenceFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason(REFUND_REASONS[0]);
      setCustomReason("");
      setDescription("");
      setRequestedAmount(orderItem.lineTotalAmount);
      setEvidenceNote("");
      setEvidenceFileUrl(null);
    }
  }, [open, orderItem.id, orderItem.lineTotalAmount]);

  if (!open) return null;

  const resolvedReason = reason === "Other" ? customReason.trim() : reason;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetchWithAuth("/api/refunds/upload", {
        method: "POST",
        body: form,
      });
      const data = await parseApiResponse<{ url: string }>(response);
      setEvidenceFileUrl(data.url);
      toast.success("Evidence uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (resolvedReason.length < 3) {
      toast.error("Please provide a reason");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithAuth("/api/refunds/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: orderItem.id,
          reason: resolvedReason,
          description: description.trim() || undefined,
          requestedAmount,
          evidenceFileUrl: evidenceFileUrl ?? undefined,
          evidenceNote: evidenceNote.trim() || undefined,
        }),
      });
      const created = await parseApiResponse<{ id: string }>(response);
      toast.success("Refund request submitted");
      onSuccess(created.id);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit refund request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Request refund</h2>
            <p className="text-sm text-neutral-500">{orderItem.productName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Reason
            </label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={INPUT_CLASS}
            >
              {REFUND_REASONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {reason === "Other" ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Custom reason
              </label>
              <input
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                className={INPUT_CLASS}
                placeholder="Describe the issue"
              />
            </div>
          ) : null}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className={INPUT_CLASS}
              placeholder="Add details to help the vendor review your request"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Requested amount
            </label>
            <input
              type="number"
              min={1}
              max={orderItem.lineTotalAmount}
              value={Math.round(requestedAmount / 100)}
              onChange={(event) =>
                setRequestedAmount(Math.min(orderItem.lineTotalAmount, Number(event.target.value) * 100))
              }
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Max {formatRefundMoney(orderItem.lineTotalAmount, orderItem.currency, locale)}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Evidence note
            </label>
            <input
              value={evidenceNote}
              onChange={(event) => setEvidenceNote(event.target.value)}
              className={INPUT_CLASS}
              placeholder="Optional note about your evidence"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Evidence file
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="mt-1 block w-full text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            {uploading ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
              </p>
            ) : evidenceFileUrl ? (
              <p className="mt-1 text-xs text-emerald-700">Evidence uploaded</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit request
          </button>
        </div>
      </div>
    </div>
  );
}
