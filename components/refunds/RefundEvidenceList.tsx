"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import type { RefundCaseDetail } from "@/components/refunds/refund-types";
import { formatRefundDate } from "@/components/refunds/format-refund-money";

export function RefundEvidenceList({
  evidences,
  locale,
}: {
  evidences: RefundCaseDetail["evidences"];
  locale: string;
}) {
  const t = useTranslations("Disputes");

  if (evidences.length === 0) {
    return (
      <p className="text-sm text-neutral-500">{t("detail.noEvidence")}</p>
    );
  }

  return (
    <ul className="space-y-3">
      {evidences.map((evidence) => {
        const roleKey = evidence.actorRole as
          | "CUSTOMER"
          | "VENDOR"
          | "ADMIN";
        const roleLabel =
          roleKey === "CUSTOMER" ||
          roleKey === "VENDOR" ||
          roleKey === "ADMIN"
            ? t(`chat.roles.${roleKey}`)
            : evidence.actorRole;

        return (
          <li
            key={evidence.id}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-neutral-800">{roleLabel}</span>
              <span className="text-xs text-neutral-500">
                {formatRefundDate(evidence.createdAt, locale)}
              </span>
            </div>
            {evidence.note ? (
              <p className="mt-1 whitespace-pre-wrap text-neutral-700">
                {evidence.note}
              </p>
            ) : null}
            {evidence.fileUrl ? (
              <a
                href={evidence.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {t("detail.viewFile")}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
