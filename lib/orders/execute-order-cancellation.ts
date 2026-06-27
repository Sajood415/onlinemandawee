import "server-only";

import { prisma } from "@/lib/db/prisma";
import { buildOrderCancelledEmail } from "@/lib/mail/order-status-email";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import type { OrderCancelledByRole } from "@/lib/orders/order-cancellation";

export async function executeOrderCancellation(input: {
  orderId: string;
  cancelledByRole: OrderCancelledByRole;
  cancelledByUserId?: string;
  cancellationReason?: string | null;
  notifyEmail?: string | null;
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      vendorOrders: {
        include: { items: true },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const now = new Date();
  const trimmedReason = input.cancellationReason?.trim() || null;

  await prisma.$transaction([
    prisma.orderVendor.updateMany({
      where: {
        orderId: order.id,
        status: { notIn: ["DELIVERED", "CANCELLED"] },
      },
      data: { status: "CANCELLED" },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancellationReason: trimmedReason,
        cancelledByRole: input.cancelledByRole,
        cancelledByUserId: input.cancelledByUserId ?? null,
      },
    }),
  ]);

  const customerEmail = input.notifyEmail?.trim();
  if (!customerEmail) {
    return { orderId: order.id, orderNumber: order.orderNumber, cancelledAt: now.toISOString() };
  }

  try {
    const ctx = {
      customerName: order.shippingFullName,
      orderNumber: order.orderNumber,
      grandTotalAmount: order.grandTotalAmount,
      currency: order.currency,
      shippingAddress: {
        addressLine1: order.shippingAddressLine1,
        city: order.shippingCity,
        country: order.shippingCountry,
        postalCode: order.shippingPostalCode || undefined,
        phone: order.shippingPhone || undefined,
      },
      items: order.vendorOrders.flatMap((vendorOrder) =>
        vendorOrder.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPriceAmount: item.unitPriceAmount,
          currency: item.currency,
        }))
      ),
    };
    const email = buildOrderCancelledEmail(ctx);
    await sendTransactionalEmail({ to: customerEmail, ...email });
  } catch {
    // Email failure must not fail cancellation
  }

  return { orderId: order.id, orderNumber: order.orderNumber, cancelledAt: now.toISOString() };
}
