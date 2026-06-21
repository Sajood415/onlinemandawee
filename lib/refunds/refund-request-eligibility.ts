import type { RefundEligibility } from "@/lib/refunds/refund-eligibility";

export function isPaidOrPartiallyRefunded(paymentStatus: string) {
  return paymentStatus === "PAID" || paymentStatus === "PARTIALLY_REFUNDED";
}

export function canCustomerRequestItemRefund(input: {
  paymentStatus: string;
  refundEligibility: RefundEligibility;
}) {
  const paymentAllowsRefund = isPaidOrPartiallyRefunded(input.paymentStatus);

  return paymentAllowsRefund && input.refundEligibility === "open";
}

export function canCustomerOpenRefundCase(input: {
  paymentStatus: string;
}) {
  return isPaidOrPartiallyRefunded(input.paymentStatus);
}
