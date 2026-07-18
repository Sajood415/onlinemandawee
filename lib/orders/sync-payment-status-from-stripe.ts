import "server-only";

import type { PaymentStatus } from "@/domain/order/order-status";
import { getStripeRefundableBalance } from "@/lib/orders/stripe-refundable-amount";

/**
 * Prefer Stripe's refunded total so cancel refunds and dispute refunds stay in sync.
 */
export async function resolvePaymentStatusFromStripe(input: {
  stripePaymentIntentId: string | null | undefined;
  fallbackStatus: PaymentStatus;
}): Promise<PaymentStatus> {
  if (!input.stripePaymentIntentId) {
    return input.fallbackStatus;
  }

  try {
    const { charged, alreadyRefunded } = await getStripeRefundableBalance(
      input.stripePaymentIntentId
    );

    if (charged <= 0) {
      return input.fallbackStatus;
    }
    if (alreadyRefunded >= charged) {
      return "REFUNDED";
    }
    if (alreadyRefunded > 0) {
      return "PARTIALLY_REFUNDED";
    }
    return input.fallbackStatus === "UNPAID" || input.fallbackStatus === "PENDING"
      ? input.fallbackStatus
      : "PAID";
  } catch {
    return input.fallbackStatus;
  }
}
