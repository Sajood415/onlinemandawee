import "server-only";

import type Stripe from "stripe";

import {
  normalizeCurrency,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/lib/currency/constants";
import type { GuestCheckoutQuote } from "@/lib/checkout/build-guest-checkout-quote";
import { getStripeServerClient } from "@/lib/stripe/server";

/** Stripe minimum charge amounts in minor units (cents/pence). */
const STRIPE_MINIMUM_MINOR: Record<SupportedCurrency, number> = {
  USD: 50,
  EUR: 50,
  GBP: 30,
  CAD: 50,
};

export const STRIPE_CHECKOUT_CURRENCIES = SUPPORTED_CURRENCIES;

export function getStripeCheckoutMinimumMinor(currency: string) {
  const normalized = normalizeCurrency(currency);
  return STRIPE_MINIMUM_MINOR[normalized];
}

export function assertStripeCheckoutAmount(amountMinor: number, currency: string) {
  const normalized = normalizeCurrency(currency);
  const minimum = STRIPE_MINIMUM_MINOR[normalized];

  if (amountMinor < minimum) {
    throw new StripeCheckoutPaymentError(
      "AMOUNT_TOO_LOW",
      `Order total must be at least ${minimum / 100} ${normalized} for card payment.`,
      400
    );
  }
}

export class StripeCheckoutPaymentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "StripeCheckoutPaymentError";
  }
}

type CreateCheckoutPaymentIntentInput = {
  quote: GuestCheckoutQuote;
  metadata: Record<string, string>;
};

export async function createCheckoutPaymentIntent(input: CreateCheckoutPaymentIntentInput) {
  const currency = normalizeCurrency(input.quote.currency);
  assertStripeCheckoutAmount(input.quote.grandTotalAmount, currency);

  const stripe = getStripeServerClient();

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: input.quote.grandTotalAmount,
      currency: currency.toLowerCase(),
      payment_method_types: ["card"],
      metadata: {
        checkoutCurrency: currency,
        grandTotalAmount: String(input.quote.grandTotalAmount),
        ...input.metadata,
      },
    });

    return paymentIntent;
  } catch (error) {
    const stripeErr = error as { type?: string; message?: string };
    const message =
      stripeErr.type === "StripeAuthenticationError"
        ? "Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local."
        : stripeErr.message ?? "Stripe error. Please try again.";

    throw new StripeCheckoutPaymentError("STRIPE_ERROR", message, 502);
  }
}

export function assertPaymentIntentMatchesQuote(
  paymentIntent: Stripe.PaymentIntent,
  quote: GuestCheckoutQuote
) {
  const quoteCurrency = normalizeCurrency(quote.currency).toLowerCase();

  if (paymentIntent.currency.toLowerCase() !== quoteCurrency) {
    throw new StripeCheckoutPaymentError(
      "PAYMENT_CURRENCY_MISMATCH",
      "Payment currency does not match the order total. Please try again.",
      400
    );
  }

  if (paymentIntent.amount !== quote.grandTotalAmount) {
    throw new StripeCheckoutPaymentError(
      "PAYMENT_AMOUNT_MISMATCH",
      "Payment amount does not match the order total. Please try again.",
      400
    );
  }
}
