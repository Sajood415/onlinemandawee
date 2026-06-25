import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";

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

/** Load Stripe.js only in the browser — never during SSR. */
export function getStripePromise() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey || typeof window === "undefined") {
    return null;
  }

  if (!stripePromise) {
    loadStripe.setLoadParameters({
      // Avoid extra Stripe Radar beacons that can fail on some networks.
      advancedFraudSignals: false,
    });
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

export async function ensureStripeLoaded() {
  const promise = getStripePromise();
  if (!promise) {
    throw new Error(
      "Card payments are not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY."
    );
  }

  const stripe = await promise;
  if (!stripe) {
    throw new Error(
      "Stripe could not be loaded. Check your network connection and refresh the page."
    );
  }

  return stripe;
}
