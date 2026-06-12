import "server-only";

import Stripe from "stripe";

import { env } from "@/config/env";

let stripeClient: Stripe | null = null;

export function getStripeServerClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}
