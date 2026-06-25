import { NextResponse } from "next/server";

import { getStripeKeyMode } from "@/lib/stripe/checkout-client";
import { withErrorHandling } from "@/middlewares/with-error-handling";

export const GET = withErrorHandling(async () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";

  const publishableKeyMode = getStripeKeyMode(publishableKey);
  const secretKeyMode = getStripeKeyMode(secretKey);

  return NextResponse.json({
    data: {
      configured: Boolean(publishableKey && secretKey),
      publishableKeyMode,
      secretKeyMode,
      keysMatch:
        publishableKeyMode !== "unknown" &&
        secretKeyMode !== "unknown" &&
        publishableKeyMode === secretKeyMode,
    },
  });
});
