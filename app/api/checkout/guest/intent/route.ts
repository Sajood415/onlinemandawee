import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildGuestCheckoutQuote,
  GuestCheckoutQuoteError,
} from "@/lib/checkout/build-guest-checkout-quote";
import {
  createCheckoutPaymentIntent,
  StripeCheckoutPaymentError,
} from "@/lib/stripe/checkout-payment";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import {
  checkoutCurrencySchema,
  guestCheckoutCartItemSchema,
  guestCheckoutCouponsSchema,
  guestCheckoutDeliveryAddressSchema,
} from "@/validators/checkout.validator";

const intentBodySchema = z
  .object({
    items: z.array(guestCheckoutCartItemSchema).min(1),
    currency: checkoutCurrencySchema,
    deliveryAddress: guestCheckoutDeliveryAddressSchema.optional(),
  })
  .merge(guestCheckoutCouponsSchema);

export const POST = withErrorHandling(async (request) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        error: {
          code: "CONFIG_ERROR",
          message: "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.",
        },
      },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = intentBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  let quote;
  try {
    quote = await buildGuestCheckoutQuote({
      items: parsed.data.items,
      currency: parsed.data.currency,
      couponCodes: parsed.data.couponCodes,
      vendorCoupons: parsed.data.vendorCoupons,
      deliveryAddress: parsed.data.deliveryAddress,
    });
  } catch (error) {
    if (error instanceof GuestCheckoutQuoteError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    throw error;
  }

  try {
    const paymentIntent = await createCheckoutPaymentIntent({
      quote,
      metadata: {
        source: "guest_checkout",
        itemCount: String(parsed.data.items.length),
        couponCount: String(quote.appliedCoupons.length),
      },
    });

    return NextResponse.json(
      {
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          ...quote,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof StripeCheckoutPaymentError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }
    throw error;
  }
});
