import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
import { prisma } from "@/lib/db/prisma";
import { OrderSettlementService } from "@/services/order-settlement.service";
import { safeEqual, sha256 } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
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

const orderSettlementService = new OrderSettlementService();

export const POST = withErrorHandling(async (request) => {
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

  const paymentMetadata = paymentIntent.metadata ?? {};
  if (paymentMetadata.source !== "guest_checkout") {
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_CONTEXT_MISMATCH",
          message: "Payment intent is not valid for guest checkout confirmation.",
        },
      },
      { status: 400 }
    );
  }

  const expectedContextHash = paymentMetadata.checkoutContextHash;
  if (
    !expectedContextHash ||
    !safeEqual(expectedContextHash, sha256(input.checkoutContextToken))
  ) {
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_CONTEXT_MISMATCH",
          message: "Checkout session context is invalid or expired.",
        },
      },
      { status: 400 }
    );
  }

  const expectedEmailHash = paymentMetadata.checkoutGuestEmailHash;
  if (
    expectedEmailHash &&
    !safeEqual(expectedEmailHash, sha256(normalizeEmailForAuth(input.guestEmail)))
  ) {
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_CONTEXT_MISMATCH",
          message: "Guest email does not match the original checkout session.",
        },
      },
      { status: 400 }
    );
  }

  const existingOrder = await prisma.order.findFirst({
    where: { stripePaymentIntentId: input.paymentIntentId },
  });

  if (existingOrder) {
    await orderSettlementService.settleOrderById({ orderId: existingOrder.id });

    return NextResponse.json(
      {
        data: {
          orderNumber: existingOrder.orderNumber,
          guestTrackingToken: existingOrder.guestTrackingToken,
        },
      },
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
    });

    await orderSettlementService.settleOrderById({ orderId: order.id });

    return NextResponse.json(
      {
        data: {
          orderNumber: order.orderNumber,
          orderId: order.id,
          guestTrackingToken: order.guestTrackingToken,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const recoveredOrder = await prisma.order.findUnique({
        where: { stripePaymentIntentId: input.paymentIntentId },
      });
      if (recoveredOrder) {
        await orderSettlementService.settleOrderById({ orderId: recoveredOrder.id });
        return NextResponse.json(
          {
            data: {
              orderNumber: recoveredOrder.orderNumber,
              guestTrackingToken: recoveredOrder.guestTrackingToken,
            },
          },
          { status: 200 }
        );
      }
    }
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
});
