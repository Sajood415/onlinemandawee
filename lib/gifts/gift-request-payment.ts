import "server-only";

import type Stripe from "stripe";

import { normalizeCurrency } from "@/lib/currency/constants";
import {
  assertStripeCheckoutAmount,
  StripeCheckoutPaymentError,
} from "@/lib/stripe/checkout-payment";
import { getStripeServerClient } from "@/lib/stripe/server";

type GiftRequestQuote = {
  quoteAmountMinor: number;
  quoteCurrency: string;
};

export async function createGiftRequestPaymentIntent(input: {
  giftRequestId: string;
  requestNumber: string;
  quoteAmountMinor: number;
  quoteCurrency: string;
}) {
  const currency = normalizeCurrency(input.quoteCurrency);
  assertStripeCheckoutAmount(input.quoteAmountMinor, currency);

  const stripe = getStripeServerClient();

  try {
    return await stripe.paymentIntents.create({
      amount: input.quoteAmountMinor,
      currency: currency.toLowerCase(),
      payment_method_types: ["card"],
      metadata: {
        source: "gift_request",
        giftRequestId: input.giftRequestId,
        requestNumber: input.requestNumber,
        quoteAmountMinor: String(input.quoteAmountMinor),
        quoteCurrency: currency,
      },
    });
  } catch (error) {
    const stripeErr = error as { type?: string; message?: string };
    const message =
      stripeErr.type === "StripeAuthenticationError"
        ? "Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local."
        : stripeErr.message ?? "Stripe error. Please try again.";

    throw new StripeCheckoutPaymentError("STRIPE_ERROR", message, 502);
  }
}

export function assertGiftRequestPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  quote: GiftRequestQuote
) {
  const quoteCurrency = normalizeCurrency(quote.quoteCurrency).toLowerCase();

  if (paymentIntent.currency.toLowerCase() !== quoteCurrency) {
    throw new StripeCheckoutPaymentError(
      "PAYMENT_CURRENCY_MISMATCH",
      "Payment currency does not match the quote. Please try again.",
      400
    );
  }

  if (paymentIntent.amount !== quote.quoteAmountMinor) {
    throw new StripeCheckoutPaymentError(
      "PAYMENT_AMOUNT_MISMATCH",
      "Payment amount does not match the quote. Please try again.",
      400
    );
  }

  if (paymentIntent.metadata.source !== "gift_request") {
    throw new StripeCheckoutPaymentError(
      "PAYMENT_INVALID",
      "Invalid payment for this gift request.",
      400
    );
  }
}
