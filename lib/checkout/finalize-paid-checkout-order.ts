import type Stripe from "stripe";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { OrderRepository } from "@/repositories/order.repository";
import { CheckoutFinalizationService } from "@/services/checkout-finalization.service";

type FinalizePaidCheckoutInput = {
  paymentIntent: Stripe.PaymentIntent;
  source: "guest_checkout" | "customer_checkout";
  checkoutContextToken?: string;
  checkoutGuestEmail?: string;
  authenticatedUserId?: string;
};

const checkoutFinalizationService = new CheckoutFinalizationService();
const orderRepository = new OrderRepository();

export async function finalizePaidCheckoutOrder(input: FinalizePaidCheckoutInput) {
  try {
    return await checkoutFinalizationService.finalizeFromPaidIntent(input);
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === ERROR_CODE.CONFLICT || error.code === ERROR_CODE.NOT_FOUND)
    ) {
      const existing = await orderRepository.findByStripePaymentIntentId(
        input.paymentIntent.id
      );
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}
