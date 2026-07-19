import "server-only";

import { prisma } from "@/lib/db/prisma";
import { aggregateOrderLineItemsByProduct } from "@/lib/orders/aggregate-order-line-items";
import { buildCustomerOrderTrackingUrl } from "@/lib/orders/build-order-tracking-url";
import {
  buildOrderDeliveredEmail,
  buildOrderShippedEmail,
  buildStandardWarehousePartialEmail,
  buildStandardWarehouseReadyEmail,
  type OrderEmailContext,
} from "@/lib/mail/order-status-email";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";

export type StandardDeliveryCustomerNotificationStage =
  | "PARTIAL_WAREHOUSE_RECEIPT"
  | "ALL_AT_WAREHOUSE"
  | "OUTBOUND_SHIPPED"
  | "DELIVERED";

async function loadOrderEmailContext(orderId: string): Promise<{
  to: string;
  ctx: OrderEmailContext;
} | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true } },
      vendorOrders: {
        where: { status: { not: "CANCELLED" } },
        include: { items: true },
      },
    },
  });

  if (!order || order.deliveryMethod !== "STANDARD") {
    return null;
  }

  const to = order.guestEmail ?? order.user?.email ?? null;
  if (!to) {
    return null;
  }

  const lineItems = aggregateOrderLineItemsByProduct(
    order.vendorOrders.flatMap((vendorOrder) =>
      vendorOrder.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        lineTotalAmount: item.lineTotalAmount,
      }))
    )
  );

  const ctx: OrderEmailContext = {
    customerName: order.shippingFullName,
    orderNumber: order.orderNumber,
    trackingUrl: buildCustomerOrderTrackingUrl({
      guestTrackingToken: order.guestTrackingToken,
      guestEmail: order.guestEmail,
      hasUserAccount: Boolean(order.userId),
    }),
    grandTotalAmount: order.grandTotalAmount,
    currency: order.currency,
    shippingAddress: {
      addressLine1: order.shippingAddressLine1,
      city: order.shippingCity,
      country: order.shippingCountry,
      postalCode: order.shippingPostalCode || undefined,
      phone: order.shippingPhone || undefined,
    },
    items: lineItems.map((item) => ({
      productName: item.variantName
        ? `${item.productName} (${item.variantName})`
        : item.productName,
      quantity: item.quantity,
      unitPriceAmount: item.unitPriceAmount,
      currency: order.currency,
    })),
  };

  return { to, ctx };
}

export async function sendStandardDeliveryCustomerNotification(input: {
  orderId: string;
  stage: StandardDeliveryCustomerNotificationStage;
  receivedVendorCount?: number;
  expectedVendorCount?: number;
  trackingRef?: string | null;
}) {
  try {
    const loaded = await loadOrderEmailContext(input.orderId);
    if (!loaded) return;

    const { to, ctx } = loaded;

    let email: { subject: string; html: string; text: string };

    switch (input.stage) {
      case "PARTIAL_WAREHOUSE_RECEIPT":
        if (
          input.receivedVendorCount == null ||
          input.expectedVendorCount == null ||
          input.expectedVendorCount <= 1
        ) {
          return;
        }
        email = buildStandardWarehousePartialEmail(ctx, {
          receivedVendorCount: input.receivedVendorCount,
          expectedVendorCount: input.expectedVendorCount,
        });
        break;
      case "ALL_AT_WAREHOUSE":
        email = buildStandardWarehouseReadyEmail(ctx);
        break;
      case "OUTBOUND_SHIPPED":
        email = buildOrderShippedEmail(ctx, {
          trackingRef: input.trackingRef,
          standardDelivery: true,
        });
        break;
      case "DELIVERED":
        email = buildOrderDeliveredEmail(ctx);
        break;
      default:
        return;
    }

    await sendTransactionalEmail({ to, ...email });
  } catch {
    // Warehouse actions must succeed even if email fails.
  }
}
