"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const INPUT_CLASS =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

type VendorRefundResponseFormProps = {
  refundCaseId: string;
  onSuccess: () => void;
};

export function VendorRefundResponseForm({
  refundCaseId,
  onSuccess,
}: VendorRefundResponseFormProps) {
  const t = useTranslations("Disputes.response");
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
      toast.error(
        error instanceof Error ? error.message : t("uploadError")
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (explanation.trim().length < 3) {
      toast.error(t("needExplanation"));
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
      toast.success(
        action === "ACCEPT" ? t("acceptSuccess") : t("rejectSuccess")
      );
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("submitError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">{t("title")}</h3>
        <p className="mt-1 text-sm text-neutral-600">{t("help")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["ACCEPT", "REJECT"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setAction(option)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
              action === option
                ? option === "ACCEPT"
                  ? "bg-emerald-600 text-white"
                  : "bg-red-600 text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {option === "ACCEPT" ? t("accept") : t("reject")}
          </button>
        ))}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {t("explanation")}
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
          {t("evidenceNote")}
        </label>
        <input
          value={evidenceNote}
          onChange={(event) => setEvidenceNote(event.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {t("evidenceFile")}
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
          <p className="mt-1 text-xs text-neutral-500">{t("uploading")}</p>
        ) : evidenceFileUrl ? (
          <p className="mt-1 text-xs text-emerald-700">{t("uploaded")}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("submit")}
      </button>
    </div>
  );
}
