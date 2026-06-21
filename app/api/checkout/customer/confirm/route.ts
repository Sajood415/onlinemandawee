import { NextResponse } from "next/server";
import { z } from "zod";

import { getStripeServerClient } from "@/lib/stripe/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { CheckoutFinalizationService } from "@/services/checkout-finalization.service";
import {
  checkoutDeliveryMethodSchema,
  checkoutCurrencySchema,
  checkoutShippingAddressSchema,
  checkoutShippingContactSchema,
  guestCheckoutCartItemSchema,
  guestCheckoutCouponsSchema,
} from "@/validators/checkout.validator";

const confirmBodySchema = z
  .object({
    paymentIntentId: z.string().min(1),
    checkoutContextToken: z.string().min(1),
    currency: checkoutCurrencySchema,
    deliveryMethod: checkoutDeliveryMethodSchema.optional(),
    items: z.array(guestCheckoutCartItemSchema).min(1),
  })
  .merge(checkoutShippingContactSchema)
  .merge(checkoutShippingAddressSchema.partial())
  .merge(guestCheckoutCouponsSchema);

const checkoutFinalizationService = new CheckoutFinalizationService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: { code: "CONFIG_ERROR", message: "Stripe is not configured." } },
        { status: 503 }
      );
    }

    const stripe = getStripeServerClient();
    const body = await request.json();
    const parsed = confirmBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_NOT_COMPLETED",
            message: "Payment has not been completed",
          },
        },
        { status: 400 }
      );
    }

    try {
      const order = await checkoutFinalizationService.finalizeFromPaidIntent({
        paymentIntent,
        source: "customer_checkout",
        checkoutContextToken: input.checkoutContextToken,
        authenticatedUserId: context.auth.id,
      });

      return NextResponse.json(
        { data: { orderNumber: order.orderNumber, orderId: order.id } },
        { status: 201 }
      );
    } catch (error) {
      throw error;
    }
  })
);
