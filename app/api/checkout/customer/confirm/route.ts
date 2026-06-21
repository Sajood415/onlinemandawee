import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildGuestCheckoutQuote,
  GuestCheckoutQuoteError,
} from "@/lib/checkout/build-guest-checkout-quote";
import { createGuestOrderFromQuote } from "@/lib/checkout/create-guest-order-from-quote";
import {
  assertPaymentIntentMatchesQuote,
  StripeCheckoutPaymentError,
} from "@/lib/stripe/checkout-payment";
import { getStripeServerClient } from "@/lib/stripe/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { prisma } from "@/lib/db/prisma";
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
    currency: checkoutCurrencySchema,
    deliveryMethod: checkoutDeliveryMethodSchema.optional(),
    items: z.array(guestCheckoutCartItemSchema).min(1),
  })
  .merge(checkoutShippingContactSchema)
  .merge(checkoutShippingAddressSchema.partial())
  .merge(guestCheckoutCouponsSchema);

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

    const existingOrder = await prisma.order.findFirst({
      where: { stripePaymentIntentId: input.paymentIntentId },
    });

    if (existingOrder) {
      return NextResponse.json(
        { data: { orderNumber: existingOrder.orderNumber } },
        { status: 200 }
      );
    }

    try {
      const quote = await buildGuestCheckoutQuote({
        items: input.items,
        currency: input.currency,
        couponCodes: input.couponCodes,
        vendorCoupons: input.vendorCoupons,
        deliveryMethod: input.deliveryMethod,
        deliveryAddress:
          input.addressLine1 && input.city && input.country
            ? {
                addressLine1: input.addressLine1,
                city: input.city,
                country: input.country,
                postalCode: input.postalCode ?? "",
              }
            : undefined,
      });

      assertPaymentIntentMatchesQuote(paymentIntent, quote);

      const order = await createGuestOrderFromQuote({
        quote,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        addressLine1: input.addressLine1,
        city: input.city,
        country: input.country,
        postalCode: input.postalCode,
        paymentStatus: "PAID",
        deliveryMethod: input.deliveryMethod ?? quote.deliveryMethod,
        stripePaymentIntentId: input.paymentIntentId,
        userId: context.auth.id,
      });

      return NextResponse.json(
        { data: { orderNumber: order.orderNumber, orderId: order.id } },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof GuestCheckoutQuoteError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status }
        );
      }
      if (error instanceof StripeCheckoutPaymentError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status }
        );
      }
      throw error;
    }
  })
);
