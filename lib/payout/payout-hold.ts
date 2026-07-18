import { env } from "@/config/env";

/**
 * Legacy sentinel used when Express payouts were held until delivery.
 * New payouts never use this — all methods hold PAYOUT_HOLD_DAYS after payment.
 * Kept so we can migrate old ON_HOLD rows to a real calendar date.
 */
export const EXPRESS_PAYOUT_PENDING_DELIVERY_HOLD_UNTIL = new Date(
  "9999-12-31T23:59:59.999Z"
);

type DeliveryMethod = "PICKUP" | "EXPRESS" | "STANDARD" | null | undefined;

export function isExpressPendingDeliveryHold(holdUntil: Date) {
  return holdUntil.getTime() >= EXPRESS_PAYOUT_PENDING_DELIVERY_HOLD_UNTIL.getTime();
}

/** Calendar hold: `from` + PAYOUT_HOLD_DAYS (default 7). */
export function computePayoutHoldUntilFrom(from: Date = new Date()) {
  const holdUntil = new Date(from);
  holdUntil.setUTCDate(holdUntil.getUTCDate() + env.PAYOUT_HOLD_DAYS);
  return holdUntil;
}

/**
 * Hold starts when the customer pays (settlement time).
 * Same rule for every vendor country (Afghanistan, US, Canada, UK, etc.):
 * take commission, hold PAYOUT_HOLD_DAYS (default 7), then release.
 * Delivery method does not change the hold window.
 */
export function computeInitialPayoutHoldUntil(
  _deliveryMethod?: DeliveryMethod
) {
  return computePayoutHoldUntilFrom(new Date());
}

/**
 * @deprecated Express no longer releases on delivery.
 * Use resolveEffectiveHoldUntil({ holdUntil, payoutCreatedAt }) instead.
 */
export function computeExpressPayoutHoldUntilAfterDelivery(from: Date) {
  return computePayoutHoldUntilFrom(from);
}

/** Map legacy Express "until delivered" sentinel → hold from payout creation (payment time). */
export function resolveEffectiveHoldUntil(input: {
  holdUntil: Date;
  payoutCreatedAt: Date;
}) {
  if (isExpressPendingDeliveryHold(input.holdUntil)) {
    return computePayoutHoldUntilFrom(input.payoutCreatedAt);
  }
  return input.holdUntil;
}

export function isPayoutEligibleForRelease(input: {
  holdUntil: Date;
  payoutCreatedAt: Date;
  now?: Date;
  /** @deprecated Ignored — hold is not delivery-gated. */
  deliveryMethod?: DeliveryMethod;
  /** @deprecated Ignored — hold is not delivery-gated. */
  vendorOrderStatus?: string;
  /** @deprecated Ignored — hold is not delivery-gated. */
  deliveredAt?: Date | null;
}) {
  const now = input.now ?? new Date();
  const effectiveHoldUntil = resolveEffectiveHoldUntil({
    holdUntil: input.holdUntil,
    payoutCreatedAt: input.payoutCreatedAt,
  });
  return effectiveHoldUntil <= now;
}

/**
 * Special hold labels are unused under universal calendar hold.
 * UI should show the hold-until date instead.
 */
export function payoutHoldLabel(_input: {
  deliveryMethod: DeliveryMethod;
  vendorOrderStatus: string;
  deliveredAt: Date | null;
  holdUntil: Date;
  status: string;
}) {
  return null;
}
