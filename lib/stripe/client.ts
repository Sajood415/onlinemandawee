import { loadStripe, type Stripe } from "@stripe/stripe-js";

import { SUPPORTED_CURRENCIES } from "@/lib/currency/constants";

let stripePromise: Promise<Stripe | null> | null = null;

export const STRIPE_CHECKOUT_CURRENCY_LABEL = SUPPORTED_CURRENCIES.join(", ");

export function isStripeCheckoutConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function getStripeCheckoutLocale(locale: string): "auto" | "en" {
  if (locale === "fa-AF" || locale === "ps") return "auto";
  return "en";
}

export function getStripePromise() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return null;

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}
