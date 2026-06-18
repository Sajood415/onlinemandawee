"use client";

import { ExternalLink } from "lucide-react";

import type { RefundCaseDetail } from "@/components/refunds/refund-types";
import { formatRefundDate } from "@/components/refunds/format-refund-money";

export function RefundEvidenceList({
  evidences,
  locale,
}: {
  evidences: RefundCaseDetail["evidences"];
  locale: string;
}) {
  if (evidences.length === 0) {
    return <p className="text-sm text-neutral-500">No evidence uploaded.</p>;
  }

  return (
    <ul className="space-y-3">
      {evidences.map((evidence) => (
        <li
          key={evidence.id}
          className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-neutral-800">{evidence.actorRole}</span>
            <span className="text-xs text-neutral-500">
              {formatRefundDate(evidence.createdAt, locale)}
            </span>
          </div>
          {evidence.note ? (
            <p className="mt-1 text-neutral-700 whitespace-pre-wrap">{evidence.note}</p>
          ) : null}
          {evidence.fileUrl ? (
            <a
              href={evidence.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View attachment
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
