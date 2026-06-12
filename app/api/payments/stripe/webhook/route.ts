import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { getStripeServerClient } from "@/lib/stripe/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { StripeMembershipWebhookService } from "@/services/stripe-membership-webhook.service";

const stripeMembershipWebhookService = new StripeMembershipWebhookService();

export const POST = withErrorHandling(async (request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    throw new AppError({
      code: ERROR_CODE.UNAUTHORIZED,
      message: "Missing stripe-signature header",
      statusCode: 401,
    });
  }

  const rawBody = await request.text();
  const stripe = getStripeServerClient();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "Invalid Stripe webhook signature",
      statusCode: 400,
    });
  }
  const result = await stripeMembershipWebhookService.process(event);

  return NextResponse.json({ data: result }, { status: 200 });
});
