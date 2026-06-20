import type { RefundEligibility } from "@/lib/refunds/refund-eligibility";

export function isPaidOrPartiallyRefunded(paymentStatus: string) {
  return paymentStatus === "PAID" || paymentStatus === "PARTIALLY_REFUNDED";
}

/** COD orders are considered refundable once the vendor split is delivered. */
export function isCodDeliveredRefundable(input: {
  paymentStatus: string;
  vendorOrderStatus: string;
}) {
  return input.paymentStatus === "UNPAID" && input.vendorOrderStatus === "DELIVERED";
}

export function canCustomerRequestItemRefund(input: {
  paymentStatus: string;
  vendorOrderStatus: string;
  refundEligibility: RefundEligibility;
}) {
  const paymentAllowsRefund =
    isPaidOrPartiallyRefunded(input.paymentStatus) ||
    isCodDeliveredRefundable({
      paymentStatus: input.paymentStatus,
      vendorOrderStatus: input.vendorOrderStatus,
    });

  return paymentAllowsRefund && input.refundEligibility === "open";
}

export function canCustomerOpenRefundCase(input: {
  paymentStatus: string;
  vendorOrderStatus: string;
}) {
  return (
    isPaidOrPartiallyRefunded(input.paymentStatus) ||
    isCodDeliveredRefundable({
      paymentStatus: input.paymentStatus,
      vendorOrderStatus: input.vendorOrderStatus,
    })
  );
}
