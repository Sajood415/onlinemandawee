import type Stripe from "stripe";

/** Stripe Basil API: billing period lives on subscription items, not the subscription root. */
export function stripeSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items?.data?.[0];
  if (item?.current_period_start != null && item?.current_period_end != null) {
    return {
      start: item.current_period_start,
      end: item.current_period_end,
    };
  }

  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };
  return {
    start: legacy.current_period_start,
    end: legacy.current_period_end,
  };
}
