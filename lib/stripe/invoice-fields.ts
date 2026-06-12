import type Stripe from "stripe";

type ExpandableStripeId = string | { id: string } | null | undefined;

function stripeId(value: ExpandableStripeId) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Stripe Basil API: subscription lives on invoice.parent.subscription_details. */
export function stripeInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const parent = invoice.parent;
  if (parent?.type === "subscription_details" && parent.subscription_details) {
    return stripeId(parent.subscription_details.subscription);
  }

  const legacy = (invoice as Stripe.Invoice & { subscription?: ExpandableStripeId })
    .subscription;
  return stripeId(legacy);
}

/** Stripe Basil API: payment_intent is on invoice.payments, not the invoice root. */
export function stripeInvoicePaymentIntentId(invoice: Stripe.Invoice) {
  const payments = invoice.payments?.data;
  if (payments?.length) {
    for (const payment of payments) {
      const paymentIntentId = stripeId(payment.payment?.payment_intent);
      if (paymentIntentId) {
        return paymentIntentId;
      }
    }
  }

  const legacy = (invoice as Stripe.Invoice & { payment_intent?: ExpandableStripeId })
    .payment_intent;
  return stripeId(legacy);
}
