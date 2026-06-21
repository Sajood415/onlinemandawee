import { prisma } from "@/lib/db/prisma";

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

  upsert(input: {
    paymentIntentId: string;
    source: CheckoutSource;
    userId?: string;
    checkoutContextHash: string;
    checkoutGuestEmailHash?: string;
    snapshot: Record<string, unknown>;
  }) {
    return prisma.checkoutSnapshot.upsert({
      where: { paymentIntentId: input.paymentIntentId },
      update: {
        source: input.source,
        userId: input.userId ?? null,
        checkoutContextHash: input.checkoutContextHash,
        checkoutGuestEmailHash: input.checkoutGuestEmailHash ?? null,
        snapshot: input.snapshot as any,
      },
      create: {
        paymentIntentId: input.paymentIntentId,
        source: input.source,
        userId: input.userId ?? null,
        checkoutContextHash: input.checkoutContextHash,
        checkoutGuestEmailHash: input.checkoutGuestEmailHash ?? null,
        snapshot: input.snapshot as any,
      },
    });
  }

  markConsumed(input: { paymentIntentId: string; orderId: string }) {
    return prisma.checkoutSnapshot.update({
      where: { paymentIntentId: input.paymentIntentId },
      data: { orderId: input.orderId },
    });
  }
}
