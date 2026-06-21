import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { createGuestOrderFromQuote } from "@/lib/checkout/create-guest-order-from-quote";
import type { GuestCheckoutQuote } from "@/lib/checkout/build-guest-checkout-quote";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { safeEqual, sha256 } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { CheckoutSnapshotRepository } from "@/repositories/checkout-snapshot.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { OrderSettlementService } from "@/services/order-settlement.service";

type CheckoutSource = "guest_checkout" | "customer_checkout";

type FinalizeInput = {
  paymentIntent: Stripe.PaymentIntent;
  source: CheckoutSource;
  checkoutContextToken?: string;
  checkoutGuestEmail?: string;
  authenticatedUserId?: string;
};

type SnapshotPayload = {
  quote: GuestCheckoutQuote;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  deliveryMethod: "PICKUP" | "EXPRESS" | "STANDARD";
};

function parseSnapshotPayload(raw: unknown): SnapshotPayload {
  if (!raw || typeof raw !== "object") {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "Checkout snapshot is invalid",
      statusCode: 400,
    });
  }

  const payload = raw as Record<string, unknown>;
  if (
    typeof payload.guestName !== "string" ||
    typeof payload.guestEmail !== "string" ||
    typeof payload.guestPhone !== "string" ||
    typeof payload.deliveryMethod !== "string" ||
    !payload.quote ||
    typeof payload.quote !== "object"
  ) {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "Checkout snapshot is incomplete",
      statusCode: 400,
    });
  }

  return payload as unknown as SnapshotPayload;
}

export class CheckoutFinalizationService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly checkoutSnapshotRepository = new CheckoutSnapshotRepository(),
    private readonly orderSettlementService = new OrderSettlementService()
  ) {}

  async finalizeFromPaidIntent(input: FinalizeInput) {
    if (input.paymentIntent.status !== "succeeded") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payment has not succeeded",
        statusCode: 400,
      });
    }

    const existingOrder = await this.orderRepository.findByStripePaymentIntentId(
      input.paymentIntent.id
    );
    if (existingOrder) {
      await this.orderSettlementService.settleOrderById({ orderId: existingOrder.id });
      return existingOrder;
    }

    const snapshotRecord = await this.checkoutSnapshotRepository.findByPaymentIntentId(
      input.paymentIntent.id
    );
    if (!snapshotRecord) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Checkout snapshot not found for payment intent",
        statusCode: 404,
      });
    }

    if (snapshotRecord.source !== input.source) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payment intent source mismatch",
        statusCode: 400,
      });
    }

    const metadata = input.paymentIntent.metadata ?? {};
    if (metadata.source !== input.source) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payment metadata source mismatch",
        statusCode: 400,
      });
    }

    if (input.authenticatedUserId) {
      if (snapshotRecord.userId !== input.authenticatedUserId) {
        throw new AppError({
          code: ERROR_CODE.FORBIDDEN,
          message: "Checkout snapshot does not belong to this user",
          statusCode: 403,
        });
      }
      if (metadata.checkoutCustomerUserId !== input.authenticatedUserId) {
        throw new AppError({
          code: ERROR_CODE.FORBIDDEN,
          message: "Payment intent does not belong to this customer",
          statusCode: 403,
        });
      }
    }

    if (input.checkoutContextToken) {
      const contextHash = sha256(input.checkoutContextToken);
      if (
        !safeEqual(snapshotRecord.checkoutContextHash, contextHash) ||
        !metadata.checkoutContextHash ||
        !safeEqual(metadata.checkoutContextHash, contextHash)
      ) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Checkout context validation failed",
          statusCode: 400,
        });
      }
    }

    if (input.checkoutGuestEmail && snapshotRecord.checkoutGuestEmailHash) {
      const normalizedEmailHash = sha256(
        normalizeEmailForAuth(input.checkoutGuestEmail)
      );
      if (
        !safeEqual(snapshotRecord.checkoutGuestEmailHash, normalizedEmailHash) ||
        (metadata.checkoutGuestEmailHash &&
          !safeEqual(metadata.checkoutGuestEmailHash, normalizedEmailHash))
      ) {
        throw new AppError({
          code: ERROR_CODE.BAD_REQUEST,
          message: "Guest email does not match checkout session",
          statusCode: 400,
        });
      }
    }

    const snapshot = parseSnapshotPayload(snapshotRecord.snapshot);
    const quote = snapshot.quote;

    if (
      input.paymentIntent.currency.toUpperCase() !== quote.currency.toUpperCase() ||
      input.paymentIntent.amount !== quote.grandTotalAmount
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Paid amount/currency does not match frozen checkout snapshot",
        statusCode: 400,
      });
    }

    let order:
      | Awaited<ReturnType<OrderRepository["findByStripePaymentIntentId"]>>
      | null = null;

    try {
      const created = await createGuestOrderFromQuote({
        quote,
        guestName: snapshot.guestName,
        guestEmail: snapshot.guestEmail,
        guestPhone: snapshot.guestPhone,
        addressLine1: snapshot.addressLine1 ?? undefined,
        city: snapshot.city ?? undefined,
        country: snapshot.country ?? undefined,
        postalCode: snapshot.postalCode ?? undefined,
        paymentStatus: "PAID",
        deliveryMethod: snapshot.deliveryMethod,
        stripePaymentIntentId: input.paymentIntent.id,
        userId: snapshotRecord.userId ?? undefined,
      });
      order = await this.orderRepository.findById(created.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        order = await this.orderRepository.findByStripePaymentIntentId(
          input.paymentIntent.id
        );
      } else {
        throw error;
      }
    }

    if (!order) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order could not be created from payment intent",
        statusCode: 404,
      });
    }

    await this.orderSettlementService.settleOrderById({ orderId: order.id });
    if (!snapshotRecord.orderId) {
      await this.checkoutSnapshotRepository.markConsumed({
        paymentIntentId: input.paymentIntent.id,
        orderId: order.id,
      });
    }

    return order;
  }
}
