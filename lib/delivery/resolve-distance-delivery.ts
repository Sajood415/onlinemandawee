import "server-only";

import { GuestCheckoutQuoteError } from "@/lib/checkout/guest-checkout-quote-error";
import {
  calculateGuestDelivery,
  type GuestCheckoutDeliveryBreakdown,
} from "@/lib/delivery/calculate-guest-delivery";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import type { PostalAddress } from "@/lib/maps/google-maps";

export type DistanceDeliveryQuote = {
  totalAmount: number;
  breakdown: GuestCheckoutDeliveryBreakdown[];
};

export async function resolveDistanceDeliveryQuote(input: {
  vendorProfileIds: string[];
  deliveryAddress: PostalAddress;
}): Promise<DistanceDeliveryQuote> {
  try {
    return await calculateGuestDelivery(input);
  } catch (error) {
    if (error instanceof GuestCheckoutQuoteError) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: error.message,
        statusCode: error.status,
      });
    }
    throw error;
  }
}
