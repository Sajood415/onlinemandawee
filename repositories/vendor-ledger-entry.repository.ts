import type {
  LedgerBucket,
  VendorLedgerEntryType,
} from "@/domain/payment/payment-types";
import { prisma } from "@/lib/db/prisma";

export class VendorLedgerEntryRepository {
  findByRefundCaseId(refundCaseId: string) {
    return prisma.vendorLedgerEntry.findFirst({
      where: { refundCaseId },
    });
  }

  create(input: {
    vendorProfileId: string;
    orderId?: string;
    orderVendorId?: string;
    refundCaseId?: string;
    paymentTransactionId?: string;
    payoutId?: string;
    bucket: LedgerBucket;
    entryType: VendorLedgerEntryType;
    amount: number;
    currency: string;
    description?: string;
  }) {
    return prisma.vendorLedgerEntry.create({
      data: {
        vendorProfileId: input.vendorProfileId,
        orderId: input.orderId ?? null,
        orderVendorId: input.orderVendorId ?? null,
        refundCaseId: input.refundCaseId ?? null,
        paymentTransactionId: input.paymentTransactionId ?? null,
        payoutId: input.payoutId ?? null,
        bucket: input.bucket,
        entryType: input.entryType,
        amount: input.amount,
        currency: input.currency,
        description: input.description ?? null,
      },
    });
  }

  listByVendorProfileId(vendorProfileId: string) {
    return prisma.vendorLedgerEntry.findMany({
      where: { vendorProfileId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  listByOrderVendorId(orderVendorId: string) {
    return prisma.vendorLedgerEntry.findMany({
      where: { orderVendorId },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  listByOrderVendorIds(orderVendorIds: string[]) {
    if (orderVendorIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.vendorLedgerEntry.findMany({
      where: {
        orderVendorId: {
          in: orderVendorIds,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }
}
