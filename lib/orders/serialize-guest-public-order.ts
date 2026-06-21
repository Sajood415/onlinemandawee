import type { Prisma } from "@prisma/client";

import type { GuestPublicOrder } from "@/lib/orders/guest-public-order-types";
import { maskAddressLine, maskEmail, maskPhone } from "@/lib/orders/mask-guest-pii";

export const guestTrackingOrderInclude = {
  vendorOrders: {
    orderBy: { createdAt: "asc" as const },
    include: {
      vendorProfile: {
        select: {
          storeName: true,
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

export function serializeGuestPublicOrder(order: GuestTrackingOrderRecord): GuestPublicOrder {
  const buyerEmail = order.guestEmail?.trim() || null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount,
    deliveryAmount: order.deliveryAmount,
    discountAmount: order.discountAmount,
    grandTotalAmount: order.grandTotalAmount,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    customerName: order.shippingFullName,
    contact: {
      email: buyerEmail ? maskEmail(buyerEmail) : null,
      phone: maskPhone(order.shippingPhone),
    },
    shippingAddress: {
      fullName: order.shippingFullName,
      addressLine1: maskAddressLine(),
      city: order.shippingCity,
      country: order.shippingCountry,
      postalCode: order.shippingPostalCode || null,
    },
    vendorOrders: order.vendorOrders.map((vendorOrder) => ({
      storeName: vendorOrder.vendorProfile.storeName,
      status: vendorOrder.status,
      deliveredAt: vendorOrder.deliveredAt?.toISOString() ?? null,
      currency: vendorOrder.currency,
      subtotalAmount: vendorOrder.subtotalAmount,
      deliveryAmount: vendorOrder.deliveryAmount,
      discountAmount: vendorOrder.discountAmount,
      grandTotalAmount: vendorOrder.grandTotalAmount,
      items: vendorOrder.items.map((item) => ({
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        currency: item.currency,
        unitPriceAmount: item.unitPriceAmount,
        lineTotalAmount: item.lineTotalAmount,
      })),
    })),
  };
}
