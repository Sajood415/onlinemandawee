import type { PaymentIntent, Stripe } from "@stripe/stripe-js";

import { isValidPaymentIntentClientSecret } from "@/lib/stripe/checkout-client";

type ConfirmCheckoutPayload = Record<string, unknown>;

type ConfirmCheckoutResult = {
  orderNumber: string;
  guestTrackingToken?: string | null;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForSucceededPaymentIntent(
  stripe: Stripe,
  clientSecret: string,
  initial?: PaymentIntent | null
) {
  if (initial?.status === "succeeded") {
    return initial;
  }

  if (!isValidPaymentIntentClientSecret(clientSecret)) {
    throw new Error(
      "Invalid payment session. Please refresh checkout and try again."
    );
  }

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
    if (error) {
      break;
    }
    if (paymentIntent?.status === "succeeded") {
      return paymentIntent;
    }
    if (
      paymentIntent?.status === "requires_payment_method" ||
      paymentIntent?.status === "canceled"
    ) {
      return null;
    }
    await sleep(500);
  }

  return null;
}

export async function confirmCheckoutOrderWithRetry(input: {
  confirmPath: string;
  payload: ConfirmCheckoutPayload;
  useAuthCheckout: boolean;
  postCheckout: (
    path: string,
    body: unknown,
    useAuth: boolean
  ) => Promise<Response>;
  maxAttempts?: number;
}): Promise<ConfirmCheckoutResult> {
  const maxAttempts = input.maxAttempts ?? 8;
  let lastMessage = "Order could not be recorded. Please contact support.";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await sleep(Math.min(500 * attempt, 2500));
    }

    const response = await input.postCheckout(
      input.confirmPath,
      input.payload,
      input.useAuthCheckout
    );
    const body = await response.json();

    if (response.ok) {
      return body.data as ConfirmCheckoutResult;
    }

    lastMessage = body?.error?.message ?? lastMessage;

    const retryable =
      response.status === 409 ||
      response.status === 503 ||
      response.status === 404 ||
      response.status >= 500;

    if (!retryable) {
      break;
    }
  }

  throw new Error(lastMessage);
}
