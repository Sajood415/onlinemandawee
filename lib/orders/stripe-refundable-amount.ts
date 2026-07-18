import "server-only";

import type Stripe from "stripe";

import { getStripeServerClient } from "@/lib/stripe/server";

export async function getStripeRefundableBalance(paymentIntentId: string): Promise<{
  charged: number;
  alreadyRefunded: number;
  remaining: number;
  paymentIntent: Stripe.PaymentIntent;
}> {
  const stripe = getStripeServerClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  const charged = paymentIntent.amount_received || paymentIntent.amount || 0;
  const latestCharge = paymentIntent.latest_charge;
  let alreadyRefunded = 0;

  if (latestCharge && typeof latestCharge === "object") {
    alreadyRefunded = latestCharge.amount_refunded ?? 0;
  } else {
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100,
    });
    alreadyRefunded = refunds.data
      .filter((refund) => refund.status === "succeeded" || refund.status === "pending")
      .reduce((sum, refund) => sum + refund.amount, 0);
  }

  return {
    charged,
    alreadyRefunded,
    remaining: Math.max(0, charged - alreadyRefunded),
    paymentIntent,
  };
}
