export type StripeKeyMode = "test" | "live" | "unknown";

export function getStripeKeyMode(key: string | undefined | null): StripeKeyMode {
  if (!key) return "unknown";
  if (key.startsWith("pk_test_") || key.startsWith("sk_test_")) return "test";
  if (key.startsWith("pk_live_") || key.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function isValidPaymentIntentClientSecret(clientSecret: string) {
  return /^pi_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+$/.test(clientSecret);
}

export function getStripeCheckoutLoadErrorMessage(
  stripeErrorMessage: string | undefined,
  keyMode: StripeKeyMode
) {
  const base =
    stripeErrorMessage ??
    "The card form could not load. Please refresh the page or try cash on delivery.";

  if (
    base.toLowerCase().includes("payments provider") ||
    base.toLowerCase().includes("internet connection")
  ) {
    return `${base} If this keeps happening, verify NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY are from the same Stripe account and both ${keyMode === "unknown" ? "test or live" : keyMode} keys.`;
  }

  return base;
}
