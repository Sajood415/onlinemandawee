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
<<<<<<< HEAD
import { sha256, generateOpaqueToken } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
=======
import { getStripeKeyMode } from "@/lib/stripe/checkout-client";
>>>>>>> 8b6af75 (Add storefront checkout, stock variants, Baby Care category, and Stripe fixes.)
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { CheckoutSnapshotRepository } from "@/repositories/checkout-snapshot.repository";
import {
  checkoutDeliveryMethodSchema,
  checkoutCurrencySchema,
  checkoutGuestEmailSchema,
  checkoutShippingAddressSchema,
  checkoutShippingContactSchema,
  guestCheckoutCartItemSchema,
  guestCheckoutCouponsSchema,
  guestCheckoutDeliveryAddressSchema,
} from "@/validators/checkout.validator";

const intentBodySchema = z
  .object({
    items: z.array(guestCheckoutCartItemSchema).min(1),
    currency: checkoutCurrencySchema,
    deliveryMethod: checkoutDeliveryMethodSchema.optional(),
    deliveryAddress: guestCheckoutDeliveryAddressSchema.optional(),
    checkoutGuestEmail: checkoutGuestEmailSchema.optional(),
  })
  .merge(checkoutShippingContactSchema)
  .merge(checkoutShippingAddressSchema.partial())
  .merge(guestCheckoutCouponsSchema);

const checkoutSnapshotRepository = new CheckoutSnapshotRepository();

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
      deliveryMethod: parsed.data.deliveryMethod,
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

  const publishableKeyMode = getStripeKeyMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const secretKeyMode = getStripeKeyMode(process.env.STRIPE_SECRET_KEY);

  if (
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    publishableKeyMode === "unknown" ||
    secretKeyMode === "unknown" ||
    publishableKeyMode !== secretKeyMode
  ) {
    return NextResponse.json(
      {
        error: {
          code: "CONFIG_ERROR",
          message:
            "Stripe keys are misconfigured. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY must be from the same Stripe account and both use test or live mode.",
        },
      },
      { status: 503 }
    );
  }

  try {
    const checkoutContextToken = generateOpaqueToken();
    const checkoutContextHash = sha256(checkoutContextToken);
    const checkoutGuestEmailHash = parsed.data.checkoutGuestEmail
      ? sha256(normalizeEmailForAuth(parsed.data.checkoutGuestEmail))
      : "";

    const paymentIntent = await createCheckoutPaymentIntent({
      quote,
      metadata: {
        source: "guest_checkout",
        itemCount: String(parsed.data.items.length),
        couponCount: String(quote.appliedCoupons.length),
        checkoutContextHash,
        checkoutGuestEmailHash,
      },
    });

    await checkoutSnapshotRepository.createIfAbsent({
      paymentIntentId: paymentIntent.id,
      source: "guest_checkout",
      checkoutContextHash,
      checkoutGuestEmailHash,
      snapshot: {
        quote,
        guestName: parsed.data.guestName,
        guestEmail: parsed.data.guestEmail,
        guestPhone: parsed.data.guestPhone,
        addressLine1: parsed.data.addressLine1 ?? null,
        city: parsed.data.city ?? null,
        country: parsed.data.country ?? null,
        postalCode: parsed.data.postalCode ?? null,
        deliveryMethod: parsed.data.deliveryMethod ?? quote.deliveryMethod,
      },
    });

    return NextResponse.json(
      {
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          checkoutContextToken,
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
