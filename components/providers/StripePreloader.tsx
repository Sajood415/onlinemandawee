"use client";

import { useEffect } from "react";

import { getStripePromise, isStripeCheckoutConfigured } from "@/lib/stripe/client";

/** Warm up Stripe.js in the background so payment forms mount faster. */
export function StripePreloader() {
  useEffect(() => {
    if (!isStripeCheckoutConfigured()) return;
    void getStripePromise();
  }, []);

  return null;
}
