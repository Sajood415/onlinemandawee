import { env } from "@/config/env";

/** Sentinel used while an express order is not yet delivered to the customer. */
export const EXPRESS_PAYOUT_PENDING_DELIVERY_HOLD_UNTIL = new Date(
  "9999-12-31T23:59:59.999Z"
);

type DeliveryMethod = "PICKUP" | "EXPRESS" | "STANDARD" | null | undefined;

export function isExpressPendingDeliveryHold(holdUntil: Date) {
  return holdUntil.getTime() >= EXPRESS_PAYOUT_PENDING_DELIVERY_HOLD_UNTIL.getTime();
}

export function computeInitialPayoutHoldUntil(deliveryMethod: DeliveryMethod) {
  if (deliveryMethod === "EXPRESS") {
    return new Date(EXPRESS_PAYOUT_PENDING_DELIVERY_HOLD_UNTIL);
  }

  const holdUntil = new Date();
  holdUntil.setUTCDate(holdUntil.getUTCDate() + env.PAYOUT_HOLD_DAYS);
  return holdUntil;
}

/** After express delivery, payout becomes eligible for release immediately. */
export function computeExpressPayoutHoldUntilAfterDelivery(deliveredAt: Date) {
  return new Date(deliveredAt);
}

export function isPayoutEligibleForRelease(input: {
  deliveryMethod: DeliveryMethod;
  vendorOrderStatus: string;
  deliveredAt: Date | null;
  holdUntil: Date;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  if (input.deliveryMethod === "EXPRESS") {
    if (input.vendorOrderStatus !== "DELIVERED" || !input.deliveredAt) {
      return false;
    }

    return true;
  }

  return input.holdUntil <= now;
}

export function payoutHoldLabel(input: {
  deliveryMethod: DeliveryMethod;
  vendorOrderStatus: string;
  deliveredAt: Date | null;
  holdUntil: Date;
  status: string;
}) {
  if (
    input.status === "ON_HOLD" &&
    input.deliveryMethod === "EXPRESS" &&
    (input.vendorOrderStatus !== "DELIVERED" || !input.deliveredAt)
  ) {
    return "Until delivered";
  }

  if (
    input.status === "ON_HOLD" &&
    input.deliveryMethod === "EXPRESS" &&
    input.vendorOrderStatus === "DELIVERED" &&
    input.deliveredAt
  ) {
    return "Delivered — ready to release";
  }

  return null;
}
