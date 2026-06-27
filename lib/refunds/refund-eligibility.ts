export type RefundEligibility = "not_yet_delivered" | "open" | "expired";

export function resolveDeliveredAt(input: {
  vendorOrderStatus: string;
  deliveredAt: Date | null;
  statusChangedAt?: Date | null;
}): Date | null {
  if (input.vendorOrderStatus !== "DELIVERED") {
    return null;
  }

  return input.deliveredAt ?? input.statusChangedAt ?? null;
}

export function getRefundEligibility(input: {
  vendorOrderStatus: string;
  deliveredAt: Date | null;
  statusChangedAt?: Date | null;
  windowDays: number;
  now?: Date;
}): RefundEligibility {
  if (input.vendorOrderStatus !== "DELIVERED") {
    return "not_yet_delivered";
  }

  const effectiveDeliveredAt = resolveDeliveredAt(input);

  // Delivered without a recorded timestamp — allow refunds (legacy rows).
  if (!effectiveDeliveredAt) {
    return "open";
  }

  const deadline = new Date(effectiveDeliveredAt);
  deadline.setUTCDate(deadline.getUTCDate() + input.windowDays);

  if ((input.now ?? new Date()) > deadline) {
    return "expired";
  }

  return "open";
}
