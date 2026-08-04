import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { OrderRepository } from "@/repositories/order.repository";
import { CheckoutFinalizationService } from "@/services/checkout-finalization.service";

type FinalizePaidPaypalInput = {
  paypalOrderId: string;
  paypalCaptureId: string;
  amountMinor: number;
  currency: string;
  source: "guest_checkout" | "customer_checkout";
  checkoutContextToken?: string;
  checkoutGuestEmail?: string;
  authenticatedUserId?: string;
  metadata: Record<string, string>;
};

const checkoutFinalizationService = new CheckoutFinalizationService();
const orderRepository = new OrderRepository();

export async function finalizePaidPaypalCheckout(input: FinalizePaidPaypalInput) {
  try {
    return await checkoutFinalizationService.finalizeFromPaypalCapture(input);
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === ERROR_CODE.CONFLICT || error.code === ERROR_CODE.NOT_FOUND)
    ) {
      const existing = await orderRepository.findByPaypalOrderId(input.paypalOrderId);
      if (existing) return existing;
    }
    throw error;
  }
}
