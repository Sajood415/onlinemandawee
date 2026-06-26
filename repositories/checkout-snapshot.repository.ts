import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

type CheckoutSource = "guest_checkout" | "customer_checkout";

export class CheckoutSnapshotRepository {
  create(input: {
    paymentIntentId: string;
    source: CheckoutSource;
    userId?: string;
    checkoutContextHash: string;
    checkoutGuestEmailHash?: string;
    snapshot: Record<string, unknown>;
  }) {
    return prisma.checkoutSnapshot.create({
      data: {
        paymentIntentId: input.paymentIntentId,
        source: input.source,
        userId: input.userId ?? null,
        checkoutContextHash: input.checkoutContextHash,
        checkoutGuestEmailHash: input.checkoutGuestEmailHash ?? null,
        snapshot: input.snapshot as any,
      },
    });
  }

  findByPaymentIntentId(paymentIntentId: string) {
    return prisma.checkoutSnapshot.findUnique({
      where: { paymentIntentId },
    });
  }

  createIfAbsent(input: {
    paymentIntentId: string;
    source: CheckoutSource;
    userId?: string;
    checkoutContextHash: string;
    checkoutGuestEmailHash?: string;
    snapshot: Record<string, unknown>;
  }) {
    return prisma.checkoutSnapshot
      .create({
        data: {
          paymentIntentId: input.paymentIntentId,
          source: input.source,
          userId: input.userId ?? null,
          checkoutContextHash: input.checkoutContextHash,
          checkoutGuestEmailHash: input.checkoutGuestEmailHash ?? null,
          snapshot: input.snapshot as any,
        },
      })
      .catch(async (error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return this.findByPaymentIntentId(input.paymentIntentId);
        }
        throw error;
      })
      .then((record) => {
        if (record) return record;
        throw new Error("Checkout snapshot conflict");
      });
  }

  markConsumed(input: { paymentIntentId: string; orderId: string }) {
    return prisma.checkoutSnapshot.update({
      where: { paymentIntentId: input.paymentIntentId },
      data: { orderId: input.orderId },
    });
  }

  /** Returns true when this caller is the first to link an order to the snapshot. */
  assignOrderIdIfAbsent(input: { paymentIntentId: string; orderId: string }) {
    return prisma.checkoutSnapshot
      .updateMany({
        where: { paymentIntentId: input.paymentIntentId, orderId: null },
        data: { orderId: input.orderId },
      })
      .then((result) => result.count === 1);
  }
}
