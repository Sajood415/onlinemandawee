import type { RefundCaseStatus } from "@/components/refunds/refund-types";
import { REFUND_STATUS_BADGE, REFUND_STATUS_LABELS } from "@/components/refunds/refund-types";

export function RefundStatusBadge({ status }: { status: RefundCaseStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${REFUND_STATUS_BADGE[status]}`}
    >
      {REFUND_STATUS_LABELS[status]}
    </span>
  );
}
