import { prisma } from "@/lib/db/prisma";

export class CommissionLedgerRepository {
  create(input: {
    orderId: string;
    orderVendorId: string;
    vendorProfileId: string;
    rateBps: number;
    baseAmount: number;
    commissionAmount: number;
    currency: string;
  }) {
    return prisma.commissionLedger.create({
      data: input,
    });
  }

  findByOrderVendorId(orderVendorId: string) {
    return prisma.commissionLedger.findUnique({
      where: { orderVendorId },
    });
  }

  listByVendorProfileId(vendorProfileId: string) {
    return prisma.commissionLedger.findMany({
      where: { vendorProfileId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  listAll() {
    return prisma.commissionLedger.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
