import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildGuestCheckoutQuote,
  GuestCheckoutQuoteError,
} from "@/lib/checkout/build-guest-checkout-quote";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import {
  checkoutDeliveryMethodSchema,
  checkoutCurrencySchema,
  guestCheckoutCartItemSchema,
  guestCheckoutCouponsSchema,
  guestCheckoutDeliveryAddressSchema,
} from "@/validators/checkout.validator";

const pricingBodySchema = z
  .object({
    items: z.array(guestCheckoutCartItemSchema).min(1),
    currency: checkoutCurrencySchema,
    deliveryMethod: checkoutDeliveryMethodSchema.optional(),
    deliveryAddress: guestCheckoutDeliveryAddressSchema.optional(),
  })
  .merge(guestCheckoutCouponsSchema);

export const POST = withErrorHandling(async (request) => {
  const body = await request.json();
  const parsed = pricingBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  try {
    const quote = await buildGuestCheckoutQuote({
      items: parsed.data.items,
      currency: parsed.data.currency,
      couponCodes: parsed.data.couponCodes,
      vendorCoupons: parsed.data.vendorCoupons,
      deliveryMethod: parsed.data.deliveryMethod,
      deliveryAddress: parsed.data.deliveryAddress,
    });
    return NextResponse.json({ data: quote }, { status: 200 });
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
