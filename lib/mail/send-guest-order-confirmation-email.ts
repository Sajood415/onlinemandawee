import "server-only";

import {
  buildOrderPlacedEmail,
  type OrderEmailContext,
} from "@/lib/mail/order-status-email";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";

type GuestOrderLineItem = {
  productName: string;
  quantity: number;
  unitPriceAmount: number;
  currency: string;
};

export async function sendGuestOrderConfirmationEmail(input: {
  to: string;
  customerName: string;
  orderNumber: string;
  trackingUrl: string;
  currency: string;
  grandTotalAmount: number;
  paymentMethod: "card";
  deliveryMethod?: "PICKUP" | "EXPRESS" | "STANDARD" | null;
  shippingAddress: OrderEmailContext["shippingAddress"];
  lineItems: GuestOrderLineItem[];
}) {
  try {
    const ctx: OrderEmailContext = {
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      trackingUrl: input.trackingUrl,
      currency: input.currency,
      grandTotalAmount: input.grandTotalAmount,
      shippingAddress: input.shippingAddress,
      items: input.lineItems.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        currency: item.currency,
      })),
    };

    const email = buildOrderPlacedEmail(ctx, {
      paymentMethod: input.paymentMethod,
      deliveryMethod: input.deliveryMethod,
    });
    await sendTransactionalEmail({ to: input.to, ...email });
  } catch {
    // Order is already saved; do not fail the request if mail fails.
  }
}
