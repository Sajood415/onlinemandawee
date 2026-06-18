"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

type VendorRefundResponseFormProps = {
  refundCaseId: string;
  onSuccess: () => void;
};

export function VendorRefundResponseForm({
  refundCaseId,
  onSuccess,
}: VendorRefundResponseFormProps) {
  const [action, setAction] = useState<"ACCEPT" | "REJECT">("ACCEPT");
  const [explanation, setExplanation] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceFileUrl, setEvidenceFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("refundCaseId", refundCaseId);
      const response = await fetchWithAuth("/api/refunds/upload", {
        method: "POST",
        body: form,
      });
      const data = await parseApiResponse<{ url: string }>(response);
      setEvidenceFileUrl(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (explanation.trim().length < 3) {
      toast.error("Please add an explanation");
      return;
    }

    setSubmitting(true);
    try {
      await fetchWithAuth(`/api/refunds/${refundCaseId}/vendor-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          explanation: explanation.trim(),
          evidenceFileUrl: evidenceFileUrl ?? undefined,
          evidenceNote: evidenceNote.trim() || undefined,
        }),
      });
      toast.success(action === "ACCEPT" ? "Refund accepted" : "Refund rejected and escalated");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
      <h3 className="text-sm font-semibold text-neutral-900">Vendor response</h3>
      <div className="flex gap-2">
        {(["ACCEPT", "REJECT"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setAction(option)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              action === option
                ? option === "ACCEPT"
                  ? "bg-emerald-600 text-white"
                  : "bg-red-600 text-white"
                : "border border-neutral-300 text-neutral-700"
            }`}
          >
            {option === "ACCEPT" ? "Accept refund" : "Reject & escalate"}
          </button>
        ))}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Explanation
        </label>
        <textarea
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          rows={3}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Evidence note
        </label>
        <input
          value={evidenceNote}
          onChange={(event) => setEvidenceNote(event.target.value)}
          className={INPUT_CLASS}
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
          <p className="mt-1 text-xs text-neutral-500">Uploading…</p>
        ) : evidenceFileUrl ? (
          <p className="mt-1 text-xs text-emerald-700">Evidence uploaded</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Submit response
      </button>
    </div>
  );
}
