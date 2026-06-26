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

  findByOrderVendorIds(orderVendorIds: string[]) {
    if (orderVendorIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.payout.findMany({
      where: {
        orderVendorId: { in: orderVendorIds },
      },
    });
  }

  findById(id: string) {
    return prisma.payout.findUnique({
      where: { id },
    });
  }

  async findByIdForAdmin(id: string) {
    const payout = await prisma.payout.findUnique({
      where: { id },
    });

    if (!payout) {
      return null;
    }

    const [vendorProfile, orderVendor, payoutMethod, commission] = await Promise.all([
      prisma.vendorProfile.findUnique({
        where: { id: payout.vendorProfileId },
        select: {
          id: true,
          storeName: true,
          storeSlug: true,
        },
      }),
      prisma.orderVendor.findUnique({
        where: { id: payout.orderVendorId },
        select: {
          id: true,
          orderId: true,
          status: true,
          deliveryMethod: true,
          deliveredAt: true,
          currency: true,
          subtotalAmount: true,
          deliveryAmount: true,
          discountAmount: true,
          grandTotalAmount: true,
          order: {
            select: {
              orderNumber: true,
            },
          },
          items: {
            select: {
              id: true,
              productName: true,
              productSku: true,
              variantName: true,
              quantity: true,
              unitPriceAmount: true,
              lineTotalAmount: true,
              currency: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.vendorPayoutMethod.findUnique({
        where: { vendorProfileId: payout.vendorProfileId },
      }),
      prisma.commissionLedger.findUnique({
        where: { orderVendorId: payout.orderVendorId },
      }),
    ]);

    return {
      ...payout,
      vendorProfile: vendorProfile ?? {
        id: payout.vendorProfileId,
        storeName: null,
        storeSlug: null,
      },
      orderVendor: orderVendor ?? {
        id: payout.orderVendorId,
        orderId: null,
        status: "NEW",
        deliveryMethod: null,
        deliveredAt: null,
        currency: payout.currency,
        subtotalAmount: 0,
        deliveryAmount: 0,
        discountAmount: 0,
        grandTotalAmount: 0,
        order: { orderNumber: "—" },
        items: [],
      },
      payoutMethod,
      commission,
    };
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

  listForAdmin(input: {
    statuses?: PayoutStatus[];
    holdUntilLte?: Date;
    holdUntilGt?: Date;
  }) {
    return prisma.payout
      .findMany({
      where: {
        ...(input.statuses && input.statuses.length > 0
          ? {
              status: { in: input.statuses },
            }
          : {}),
        ...(input.holdUntilLte
          ? {
              holdUntil: { lte: input.holdUntilLte },
            }
          : {}),
        ...(input.holdUntilGt
          ? {
              holdUntil: { gt: input.holdUntilGt },
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      })
      .then(async (payouts) => {
        const vendorIds = [...new Set(payouts.map((payout) => payout.vendorProfileId))];
        const orderVendorIds = [...new Set(payouts.map((payout) => payout.orderVendorId))];

        const [vendors, orderVendors] = await Promise.all([
          prisma.vendorProfile.findMany({
            where: { id: { in: vendorIds } },
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
            },
          }),
          prisma.orderVendor.findMany({
            where: { id: { in: orderVendorIds } },
            select: {
              id: true,
              orderId: true,
              deliveryMethod: true,
              status: true,
              deliveredAt: true,
              order: {
                select: {
                  orderNumber: true,
                },
              },
            },
          }),
        ]);

        const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
        const orderVendorById = new Map(
          orderVendors.map((orderVendor) => [orderVendor.id, orderVendor])
        );

        return payouts.map((payout) => ({
          ...payout,
          vendorProfile: vendorById.get(payout.vendorProfileId) ?? {
            id: payout.vendorProfileId,
            storeName: null,
            storeSlug: null,
          },
          orderVendor: orderVendorById.get(payout.orderVendorId) ?? {
            id: payout.orderVendorId,
            orderId: null,
            deliveryMethod: null,
            status: "NEW",
            deliveredAt: null,
            order: {
              orderNumber: "—",
            },
          },
        }));
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

  updateHoldUntil(id: string, holdUntil: Date) {
    return prisma.payout.update({
      where: { id },
      data: { holdUntil },
    });
  }
}
