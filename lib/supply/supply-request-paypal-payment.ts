import "server-only";

import { normalizeCurrency } from "@/lib/currency/constants";
import {
  assertPayPalOrderPaid,
  createPayPalOrder,
  getPayPalOrder,
  capturePayPalOrder,
} from "@/lib/paypal/checkout-payment";
import { assertPayPalConfigured } from "@/lib/paypal/server";

export async function createSupplyRequestPayPalOrder(input: {
  supplyRequestId: string;
  requestNumber: string;
  quoteAmountMinor: number;
  quoteCurrency: string;
}) {
  assertPayPalConfigured();
  const currency = normalizeCurrency(input.quoteCurrency);

  return createPayPalOrder({
    amountMinor: input.quoteAmountMinor,
    currency,
    customId: `supply:${input.supplyRequestId}`,
    description: `Supply request ${input.requestNumber}`,
    invoiceId: `supply-${input.requestNumber}-${Date.now()}`,
  });
}

export async function assertSupplyRequestPayPalPaid(input: {
  paypalOrderId: string;
  supplyRequestId: string;
  quoteAmountMinor: number;
  quoteCurrency: string;
}) {
  let order = await getPayPalOrder(input.paypalOrderId);
  if (order.status !== "COMPLETED") {
    order = await capturePayPalOrder(input.paypalOrderId);
  }

  const customId = order.purchase_units?.[0]?.custom_id ?? "";
  if (customId && customId !== `supply:${input.supplyRequestId}`) {
    throw new Error("Payment does not match this supply request");
  }

  return assertPayPalOrderPaid(order, {
    amountMinor: input.quoteAmountMinor,
    currency: input.quoteCurrency,
  });
}
