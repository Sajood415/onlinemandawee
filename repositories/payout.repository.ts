import type { PayoutStatus } from "@/domain/payment/payment-types";
import { prisma } from "@/lib/db/prisma";

export class PayoutRepository {
  create(input: {
    vendorProfileId: string;
    orderVendorId: string;
    amount: number;
    currency: string;
    holdUntil: Date;
  }) {
    return prisma.payout.create({
      data: {
        vendorProfileId: input.vendorProfileId,
        orderVendorId: input.orderVendorId,
        amount: input.amount,
        currency: input.currency,
        holdUntil: input.holdUntil,
      },
    });
  }

  findByOrderVendorId(orderVendorId: string) {
    return prisma.payout.findUnique({
      where: { orderVendorId },
    });
  }

  findById(id: string) {
    return prisma.payout.findUnique({
      where: { id },
    });
  }

  listByVendorProfileId(vendorProfileId: string) {
    return prisma.payout.findMany({
      where: { vendorProfileId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  listAll() {
    return prisma.payout.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  listReleasable(input: { vendorProfileId?: string; now: Date }) {
    return prisma.payout.findMany({
      where: {
        status: "ON_HOLD",
        holdUntil: {
          lte: input.now,
        },
        ...(input.vendorProfileId
          ? {
              vendorProfileId: input.vendorProfileId,
            }
          : {}),
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  updateStatus(
    id: string,
    status: PayoutStatus,
    extra?: {
      releasedAt?: Date | null;
      sentAt?: Date | null;
      failureReason?: string | null;
    }
  ) {
    return prisma.payout.update({
      where: { id },
      data: {
        status,
        releasedAt: extra?.releasedAt,
        sentAt: extra?.sentAt,
        failureReason: extra?.failureReason,
      },
    });
  }

  updateAmount(id: string, amount: number) {
    return prisma.payout.update({
      where: { id },
      data: {
        amount,
      },
    });
  }
}
