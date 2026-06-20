import type { RefundCaseStatus, RefundDecisionType } from "@/components/refunds/refund-types";
import { getRefundOutcomeDisplay } from "@/components/refunds/refund-types";

export function RefundStatusBadge({
  status,
  decision,
}: {
  status: RefundCaseStatus;
  decision?: { decisionType: RefundDecisionType } | null;
}) {
  const display = getRefundOutcomeDisplay({
    status,
    decision: decision ?? null,
  });

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${display.badgeClass}`}
    >
      {display.label}
    </span>
  );
}
