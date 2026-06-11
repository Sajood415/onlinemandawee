import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import {
  buildGuestCheckoutQuote,
  GuestCheckoutQuoteError,
} from "@/lib/checkout/build-guest-checkout-quote";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import {
  guestCheckoutCartItemSchema,
  guestCheckoutCouponsSchema,
  guestCheckoutDeliveryAddressSchema,
} from "@/validators/checkout.validator";

const intentBodySchema = z
  .object({
    items: z.array(guestCheckoutCartItemSchema).min(1),
    currency: z.string().length(3).default("USD"),
    deliveryAddress: guestCheckoutDeliveryAddressSchema.optional(),
  })
  .merge(guestCheckoutCouponsSchema);

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
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

    const stripe = new Stripe(stripeSecretKey);
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

    if (quote.grandTotalAmount < 50) {
      return NextResponse.json(
        { error: { code: "AMOUNT_TOO_LOW", message: "Order total is too low" } },
        { status: 400 }
      );
    }

    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: quote.grandTotalAmount,
        currency: quote.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          source: "customer_checkout",
          itemCount: String(parsed.data.items.length),
          couponCount: String(quote.appliedCoupons.length),
        },
      });
    } catch (err) {
      const stripeErr = err as { type?: string; message?: string };
      const msg =
        stripeErr.type === "StripeAuthenticationError"
          ? "Invalid Stripe API key. Please check your STRIPE_SECRET_KEY in .env.local."
          : (stripeErr.message ?? "Stripe error. Please try again.");
      return NextResponse.json({ error: { code: "STRIPE_ERROR", message: msg } }, { status: 502 });
    }

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
  })
);
