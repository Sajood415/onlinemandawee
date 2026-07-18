"use client";

import { useTranslations } from "next-intl";

import type { RefundCaseStatus, RefundDecisionType } from "@/components/refunds/refund-types";
import { getRefundOutcomeDisplay } from "@/components/refunds/refund-types";

export function RefundStatusBadge({
  status,
  decision,
  label,
}: {
  status: RefundCaseStatus;
  decision?: { decisionType: RefundDecisionType } | null;
  label?: string;
}) {
  const t = useTranslations("Disputes");
  const display = getRefundOutcomeDisplay({
    status,
    decision: decision ?? null,
  });

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${display.badgeClass}`}
    >
      {label ?? t(display.labelKey)}
    </span>
  );
}
