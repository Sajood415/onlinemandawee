import { NextResponse } from "next/server";
import { z } from "zod";

import { GuestCheckoutQuoteError } from "@/lib/checkout/build-guest-checkout-quote";
import { createPaypalCheckoutSession } from "@/lib/checkout/create-paypal-checkout-session";
import { AppError } from "@/lib/errors/app-error";
import { isPayPalConfigured } from "@/lib/paypal/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import {
  checkoutCurrencySchema,
  checkoutDeliveryMethodSchema,
  checkoutShippingAddressSchema,
  checkoutShippingContactSchema,
  guestCheckoutCartItemSchema,
  guestCheckoutCouponsSchema,
  guestCheckoutDeliveryAddressSchema,
} from "@/validators/checkout.validator";

const bodySchema = z
  .object({
    items: z.array(guestCheckoutCartItemSchema).min(1),
    currency: checkoutCurrencySchema,
    deliveryMethod: checkoutDeliveryMethodSchema.optional(),
    deliveryAddress: guestCheckoutDeliveryAddressSchema.optional(),
  })
  .merge(checkoutShippingContactSchema)
  .merge(checkoutShippingAddressSchema.partial())
  .merge(guestCheckoutCouponsSchema);

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: { code: "CONFIG_ERROR", message: "PayPal is not configured." } },
        { status: 503 }
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
        { status: 400 }
      );
    }

    try {
      const session = await createPaypalCheckoutSession({
        source: "customer_checkout",
        userId: context.auth.id,
        items: parsed.data.items,
        currency: parsed.data.currency,
        couponCodes: parsed.data.couponCodes,
        vendorCoupons: parsed.data.vendorCoupons,
        deliveryMethod: parsed.data.deliveryMethod,
        deliveryAddress: parsed.data.deliveryAddress,
        contact: {
          guestName: parsed.data.guestName,
          guestEmail: parsed.data.guestEmail,
          guestPhone: parsed.data.guestPhone,
        },
        shipping: {
          addressLine1: parsed.data.addressLine1,
          city: parsed.data.city,
          country: parsed.data.country,
          postalCode: parsed.data.postalCode,
        },
      });

      return NextResponse.json(
        {
          data: {
            paypalOrderId: session.paypalOrderId,
            checkoutContextToken: session.checkoutContextToken,
            ...session.quote,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof GuestCheckoutQuoteError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status }
        );
      }
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message } },
          { status: error.statusCode }
        );
      }
      throw error;
    }
  })
);
