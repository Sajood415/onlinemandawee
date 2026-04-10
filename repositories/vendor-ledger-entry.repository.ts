import type {
  LedgerBucket,
  VendorLedgerEntryType,
} from "@/domain/payment/payment-types";
import { prisma } from "@/lib/db/prisma";

export class VendorLedgerEntryRepository {
  create(input: {
    vendorProfileId: string;
    orderId?: string;
    orderVendorId?: string;
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
}
