import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import {
  buildGuestCheckoutQuote,
  GuestCheckoutQuoteError,
} from "@/lib/checkout/build-guest-checkout-quote";
import { createGuestOrderFromQuote } from "@/lib/checkout/create-guest-order-from-quote";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { prisma } from "@/lib/db/prisma";
import {
  guestCheckoutCartItemSchema,
  guestCheckoutCouponsSchema,
} from "@/validators/checkout.validator";

const confirmBodySchema = z
  .object({
    paymentIntentId: z.string().min(1),
    guestName: z.string().min(1),
    guestEmail: z.string().email(),
    guestPhone: z.string().min(1),
    addressLine1: z.string().min(1),
    city: z.string().min(1),
    country: z.string().min(1),
    postalCode: z.string().default(""),
    currency: z.string().length(3),
    items: z.array(guestCheckoutCartItemSchema).min(1),
  })
  .merge(guestCheckoutCouponsSchema);

export const POST = withErrorHandling(async (request) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: { code: "CONFIG_ERROR", message: "Stripe is not configured." } },
      { status: 503 }
    );
  }
  const stripe = new Stripe(stripeSecretKey);

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
    });

    if (quote.grandTotalAmount !== paymentIntent.amount) {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_AMOUNT_MISMATCH",
            message: "Payment amount does not match the order total. Please try again.",
          },
        },
        { status: 400 }
      );
    }

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
      stripePaymentIntentId: input.paymentIntentId,
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
    throw error;
  }
});
