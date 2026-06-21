import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { getStripeServerClient } from "@/lib/stripe/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { OrderRepository } from "@/repositories/order.repository";
import { PaymentWebhookService } from "@/services/payment-webhook.service";
import { StripeMembershipWebhookService } from "@/services/stripe-membership-webhook.service";

const stripeMembershipWebhookService = new StripeMembershipWebhookService();
const paymentWebhookService = new PaymentWebhookService();
const orderRepository = new OrderRepository();

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
  let result: unknown;
  if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed"
  ) {
    const paymentIntent = event.data.object;
    const order = await orderRepository.findByStripePaymentIntentId(paymentIntent.id);

    if (!order) {
      result = {
        ignored: true,
        reason: "order_not_found_for_payment_intent",
        paymentIntentId: paymentIntent.id,
      };
    } else {
      result = await paymentWebhookService.process("STRIPE", {
        eventId: event.id,
        eventType:
          event.type === "payment_intent.succeeded"
            ? "payment.succeeded"
            : "payment.failed",
        orderId: order.id,
        providerPaymentId: paymentIntent.id,
        amount: paymentIntent.amount_received || paymentIntent.amount || 0,
        currency: (paymentIntent.currency ?? "").toUpperCase(),
        payload: paymentIntent as unknown as Record<string, unknown>,
      });
    }
  } else {
    result = await stripeMembershipWebhookService.process(event);
  }

  return NextResponse.json({ data: result }, { status: 200 });
});
