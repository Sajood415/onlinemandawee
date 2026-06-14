import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildGuestCheckoutQuote,
  GuestCheckoutQuoteError,
} from "@/lib/checkout/build-guest-checkout-quote";
import { createGuestOrderFromQuote } from "@/lib/checkout/create-guest-order-from-quote";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import {
  checkoutCurrencySchema,
  checkoutShippingContactSchema,
  guestCheckoutCartItemSchema,
  guestCheckoutCouponsSchema,
} from "@/validators/checkout.validator";

const confirmCodBodySchema = z
  .object({
    currency: checkoutCurrencySchema,
    items: z.array(guestCheckoutCartItemSchema).min(1),
  })
  .merge(checkoutShippingContactSchema)
  .merge(guestCheckoutCouponsSchema);

export const POST = withErrorHandling(async (request) => {
  const body = await request.json();
  const parsed = confirmCodBodySchema.safeParse(body);

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

  try {
    const quote = await buildGuestCheckoutQuote({
      items: input.items,
      currency: input.currency,
      couponCodes: input.couponCodes,
      vendorCoupons: input.vendorCoupons,
      deliveryAddress: {
        addressLine1: input.addressLine1,
        city: input.city,
        country: input.country,
        postalCode: input.postalCode,
      },
    });

    const order = await createGuestOrderFromQuote({
      quote,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      addressLine1: input.addressLine1,
      city: input.city,
      country: input.country,
      postalCode: input.postalCode,
      paymentStatus: "UNPAID",
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
