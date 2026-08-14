import type { Prisma } from "@prisma/client";

export const guestTrackingOrderInclude = {
  consolidationBatch: true,
  outboundShipment: true,
  vendorOrders: {
    orderBy: { createdAt: "asc" as const },
    include: {
      inboundShipment: true,
      vendorProfile: {
        select: {
          storeName: true,
          sellerType: true,
          address: {
            select: {
              addressLine1: true,
              city: true,
              country: true,
              postalCode: true,
            },
          },
        },
      },
      items: {
        select: {
          productName: true,
          productImage: true,
          quantity: true,
          currency: true,
          unitPriceAmount: true,
          lineTotalAmount: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export type GuestTrackingOrderRecord = Prisma.OrderGetPayload<{
  include: typeof guestTrackingOrderInclude;
}>;
