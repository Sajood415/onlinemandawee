import "server-only";

import { normalizeCurrency } from "@/lib/currency/constants";
import {
  assertPayPalOrderPaid,
  createPayPalOrder,
  getPayPalOrder,
  capturePayPalOrder,
} from "@/lib/paypal/checkout-payment";
import { assertPayPalConfigured } from "@/lib/paypal/server";

export async function createGiftRequestPayPalOrder(input: {
  giftRequestId: string;
  requestNumber: string;
  quoteAmountMinor: number;
  quoteCurrency: string;
}) {
  assertPayPalConfigured();
  const currency = normalizeCurrency(input.quoteCurrency);

  return createPayPalOrder({
    amountMinor: input.quoteAmountMinor,
    currency,
    customId: `gift:${input.giftRequestId}`,
    description: `Gift request ${input.requestNumber}`,
    invoiceId: `gift-${input.requestNumber}-${Date.now()}`,
  });
}

export async function assertGiftRequestPayPalPaid(input: {
  paypalOrderId: string;
  giftRequestId: string;
  quoteAmountMinor: number;
  quoteCurrency: string;
}) {
  let order = await getPayPalOrder(input.paypalOrderId);
  if (order.status !== "COMPLETED") {
    order = await capturePayPalOrder(input.paypalOrderId);
  }

  const customId = order.purchase_units?.[0]?.custom_id ?? "";
  if (customId && customId !== `gift:${input.giftRequestId}`) {
    throw new Error("Payment does not match this gift request");
  }

  return assertPayPalOrderPaid(order, {
    amountMinor: input.quoteAmountMinor,
    currency: input.quoteCurrency,
  });
}
