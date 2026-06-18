export type RefundEligibility = "not_yet_delivered" | "open" | "expired";

export function getRefundEligibility(input: {
  vendorOrderStatus: string;
  deliveredAt: Date | null;
  windowDays: number;
  now?: Date;
}): RefundEligibility {
  if (input.vendorOrderStatus !== "DELIVERED" || !input.deliveredAt) {
    return "not_yet_delivered";
  }

  const deadline = new Date(input.deliveredAt);
  deadline.setUTCDate(deadline.getUTCDate() + input.windowDays);

  if ((input.now ?? new Date()) > deadline) {
    return "expired";
  }

  return "open";
}
