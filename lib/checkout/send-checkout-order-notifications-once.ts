import "server-only";

import type { GuestCheckoutQuote } from "@/lib/checkout/build-guest-checkout-quote";
import { sendGuestCheckoutOrderNotifications } from "@/lib/checkout/create-guest-order-from-quote";
import { durationFromNow } from "@/lib/utils/duration";
import { IdempotencyKeyRepository } from "@/repositories/idempotency-key.repository";
import { Prisma } from "@prisma/client";

type CheckoutNotificationInput = {
  orderId: string;
  quote: GuestCheckoutQuote;
  orderNumber: string;
  guestTrackingToken: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  paymentStatus: "PAID";
  deliveryMethod?: "PICKUP" | "EXPRESS" | "STANDARD";
};

const idempotencyKeyRepository = new IdempotencyKeyRepository();

function notificationKey(orderId: string) {
  return `order_notifications:${orderId}`;
}

export async function sendCheckoutOrderNotificationsOnce(
  input: CheckoutNotificationInput
) {
  const key = notificationKey(input.orderId);
  const existing = await idempotencyKeyRepository.findByKey(key);
  if (existing?.status === "SUCCEEDED") {
    return false;
  }
  if (existing?.status === "IN_PROGRESS") {
    return false;
  }

  if (!existing) {
    try {
      await idempotencyKeyRepository.createInProgress({
        key,
        scope: "order_notifications",
        requestHash: input.orderId,
        expiresAt: durationFromNow("30d"),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await idempotencyKeyRepository.findByKey(key);
        if (raced?.status === "SUCCEEDED" || raced?.status === "IN_PROGRESS") {
          return false;
        }
      } else {
        throw error;
      }
    }
  }

  try {
    await sendGuestCheckoutOrderNotifications(input);
    await idempotencyKeyRepository.markSucceeded({
      key,
      responseCode: 200,
      responseBody: { orderId: input.orderId, orderNumber: input.orderNumber },
      resourceType: "Order",
      resourceId: input.orderId,
    });
    return true;
  } catch (error) {
    try {
      await idempotencyKeyRepository.markFailed({
        key,
        responseCode: 500,
        responseBody: {
          message:
            error instanceof Error ? error.message : "Notification delivery failed",
        },
      });
    } catch {
      // Allow a later retry if marking failed also fails.
    }
    throw error;
  }
}
