import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { createGuestOrderFromQuote } from "@/lib/checkout/create-guest-order-from-quote";
import type { GuestCheckoutQuote } from "@/lib/checkout/build-guest-checkout-quote";
import { sendCheckoutOrderNotificationsOnce } from "@/lib/checkout/send-checkout-order-notifications-once";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { getStripeServerClient } from "@/lib/stripe/server";
import { durationFromNow } from "@/lib/utils/duration";
import { safeEqual, sha256 } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { CheckoutSnapshotRepository } from "@/repositories/checkout-snapshot.repository";
import { IdempotencyKeyRepository } from "@/repositories/idempotency-key.repository";
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

const OUT_OF_STOCK_ERROR_MESSAGE =
  "Some items are out of stock. Please refresh your cart and try again.";

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

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

type FinalizedOrder = {
  id: string;
  orderNumber: string;
  guestTrackingToken: string | null;
};

export class CheckoutFinalizationService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly checkoutSnapshotRepository = new CheckoutSnapshotRepository(),
    private readonly orderSettlementService = new OrderSettlementService(),
    private readonly idempotencyKeyRepository = new IdempotencyKeyRepository()
  ) {}

  private finalizeLockKey(paymentIntentId: string) {
    return `checkout_finalize:${paymentIntentId}`;
  }

  private async findExistingOrderForPaymentIntent(paymentIntentId: string) {
    const byPaymentIntent =
      await this.orderRepository.findByStripePaymentIntentId(paymentIntentId);
    if (byPaymentIntent) {
      return byPaymentIntent;
    }

    const snapshot =
      await this.checkoutSnapshotRepository.findByPaymentIntentId(paymentIntentId);
    if (!snapshot?.orderId) {
      return null;
    }

    return this.orderRepository.findById(snapshot.orderId);
  }

  private async tryAcquireFinalizeLock(paymentIntentId: string) {
    try {
      await this.idempotencyKeyRepository.createInProgress({
        key: this.finalizeLockKey(paymentIntentId),
        scope: "checkout_finalize",
        requestHash: paymentIntentId,
        expiresAt: durationFromNow("1h"),
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return false;
      }
      throw error;
    }
  }

  private async waitForExistingFinalizedOrder(paymentIntentId: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const existing = await this.findExistingOrderForPaymentIntent(paymentIntentId);
      if (existing) {
        return this.finalizeExistingOrder(paymentIntentId, existing);
      }

      const lock = await this.idempotencyKeyRepository.findByKey(
        this.finalizeLockKey(paymentIntentId)
      );
      if (lock?.status === "SUCCEEDED" && lock.resourceId) {
        const linked = await this.orderRepository.findById(lock.resourceId);
        if (linked) {
          return this.finalizeExistingOrder(paymentIntentId, linked);
        }
      }
      if (lock?.status === "FAILED") {
        break;
      }

      await wait(250);
    }

    const existing = await this.findExistingOrderForPaymentIntent(paymentIntentId);
    if (existing) {
      return this.finalizeExistingOrder(paymentIntentId, existing);
    }

    throw new AppError({
      code: ERROR_CODE.CONFLICT,
      message: "Checkout is still being finalized. Please refresh in a moment.",
      statusCode: 409,
    });
  }

  private async markFinalizeSucceeded(paymentIntentId: string, orderId: string) {
    await this.idempotencyKeyRepository.markSucceeded({
      key: this.finalizeLockKey(paymentIntentId),
      responseCode: 201,
      responseBody: { orderId },
      resourceType: "Order",
      resourceId: orderId,
    });
  }

  private async ensureOrderNotifications(input: {
    paymentIntentId: string;
    order: FinalizedOrder;
  }) {
    const snapshotRecord = await this.checkoutSnapshotRepository.findByPaymentIntentId(
      input.paymentIntentId
    );
    if (!snapshotRecord?.snapshot) {
      return;
    }

    const snapshot = parseSnapshotPayload(snapshotRecord.snapshot);

    try {
      await sendCheckoutOrderNotificationsOnce({
        orderId: input.order.id,
        quote: snapshot.quote,
        orderNumber: input.order.orderNumber,
        guestTrackingToken: input.order.guestTrackingToken ?? "",
        guestName: snapshot.guestName,
        guestEmail: snapshot.guestEmail,
        guestPhone: snapshot.guestPhone,
        addressLine1: snapshot.addressLine1 ?? undefined,
        city: snapshot.city ?? undefined,
        country: snapshot.country ?? undefined,
        postalCode: snapshot.postalCode ?? undefined,
        paymentStatus: "PAID",
        deliveryMethod: snapshot.deliveryMethod,
      });
    } catch {
      // Order is already saved; do not fail checkout if mail fails.
    }

    try {
      await this.checkoutSnapshotRepository.markConsumed({
        paymentIntentId: input.paymentIntentId,
        orderId: input.order.id,
      });
    } catch {
      // Best-effort snapshot link for future lookups.
    }
  }

  private async finalizeExistingOrder(paymentIntentId: string, order: FinalizedOrder) {
    await this.ensureOrderNotifications({ paymentIntentId, order });
    await this.orderSettlementService.settleOrderById({ orderId: order.id });
    return order;
  }

  private async markFinalizeFailed(paymentIntentId: string, message: string) {
    try {
      await this.idempotencyKeyRepository.markFailed({
        key: this.finalizeLockKey(paymentIntentId),
        responseCode: 500,
        responseBody: { message },
      });
    } catch {
      // Best-effort cleanup for the in-progress lock.
    }
  }

  async finalizeFromPaidIntent(input: FinalizeInput) {
    if (input.paymentIntent.status !== "succeeded") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Payment has not succeeded",
        statusCode: 400,
      });
    }

    const existingOrder = await this.findExistingOrderForPaymentIntent(
      input.paymentIntent.id
    );
    if (existingOrder) {
      return this.finalizeExistingOrder(input.paymentIntent.id, existingOrder);
    }

    const lockAcquired = await this.tryAcquireFinalizeLock(input.paymentIntent.id);
    if (!lockAcquired) {
      return this.waitForExistingFinalizedOrder(input.paymentIntent.id);
    }

    const existingAfterLock = await this.findExistingOrderForPaymentIntent(
      input.paymentIntent.id
    );
    if (existingAfterLock) {
      await this.markFinalizeSucceeded(input.paymentIntent.id, existingAfterLock.id);
      return this.finalizeExistingOrder(input.paymentIntent.id, existingAfterLock);
    }

    let snapshotRecord = await this.checkoutSnapshotRepository.findByPaymentIntentId(
      input.paymentIntent.id
    );
    if (!snapshotRecord) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await wait(250);
        snapshotRecord = await this.checkoutSnapshotRepository.findByPaymentIntentId(
          input.paymentIntent.id
        );
        if (snapshotRecord) break;
      }
    }
    if (!snapshotRecord) {
      await this.markFinalizeFailed(
        input.paymentIntent.id,
        "Checkout snapshot not found for payment intent"
      );
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
        sendNotifications: false,
      });
      order = await this.orderRepository.findById(created.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        order = await this.findExistingOrderForPaymentIntent(input.paymentIntent.id);
      } else if (this.isOutOfStockOrderCreationError(error)) {
        await this.markFinalizeFailed(
          input.paymentIntent.id,
          error instanceof AppError ? error.message : OUT_OF_STOCK_ERROR_MESSAGE
        );
        const refunded = await this.tryRefundOnOrderCreationFailure(input.paymentIntent.id);
        throw new AppError({
          code: ERROR_CODE.CONFLICT,
          message: refunded
            ? "Order could not be created because stock changed after payment. Your payment has been refunded."
            : "Order could not be created because stock changed after payment. Automatic refund failed and requires manual support.",
          statusCode: 409,
        });
      } else {
        await this.markFinalizeFailed(
          input.paymentIntent.id,
          error instanceof Error ? error.message : "Order creation failed"
        );
        throw error;
      }
    }

    if (!order) {
      await this.markFinalizeFailed(
        input.paymentIntent.id,
        "Order could not be created from payment intent"
      );
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order could not be created from payment intent",
        statusCode: 404,
      });
    }

    const claimedSnapshot = await this.checkoutSnapshotRepository.assignOrderIdIfAbsent({
      paymentIntentId: input.paymentIntent.id,
      orderId: order.id,
    });

    if (!claimedSnapshot) {
      const winner = await this.findExistingOrderForPaymentIntent(input.paymentIntent.id);
      if (winner) {
        order = winner;
      }
    }

    await this.ensureOrderNotifications({
      paymentIntentId: input.paymentIntent.id,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        guestTrackingToken: order.guestTrackingToken,
      },
    });

    await this.orderSettlementService.settleOrderById({ orderId: order.id });
    await this.markFinalizeSucceeded(input.paymentIntent.id, order.id);

    return order;
  }

  private isOutOfStockOrderCreationError(error: unknown) {
    return (
      error instanceof AppError &&
      error.code === ERROR_CODE.BAD_REQUEST &&
      error.message === OUT_OF_STOCK_ERROR_MESSAGE
    );
  }

  private async tryRefundOnOrderCreationFailure(paymentIntentId: string) {
    try {
      const stripe = getStripeServerClient();
      await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          reason: "requested_by_customer",
          metadata: {
            reason: "order_creation_failed_out_of_stock",
            source: "checkout_finalization",
            paymentIntentId,
          },
        },
        {
          idempotencyKey: `checkout-order-create-failed:${paymentIntentId}`,
        }
      );
      return true;
    } catch {
      return false;
    }
  }
}
