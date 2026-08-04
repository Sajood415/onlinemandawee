import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { finalizePaidPaypalCheckout } from "@/lib/checkout/finalize-paid-paypal-checkout";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  getPayPalOrder,
  verifyPayPalWebhookSignature,
} from "@/lib/paypal/checkout-payment";
import { isPayPalConfigured } from "@/lib/paypal/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { OrderRepository } from "@/repositories/order.repository";
import { PaymentWebhookService } from "@/services/payment-webhook.service";

const orderRepository = new OrderRepository();
const paymentWebhookService = new PaymentWebhookService();

function payPalValueToMinor(value: string) {
  return Math.round(Number(value) * 100);
}

export const POST = withErrorHandling(async (request) => {
  if (!isPayPalConfigured()) {
    throw new AppError({
      code: ERROR_CODE.INTERNAL_SERVER_ERROR,
      message: "PayPal is not configured",
      statusCode: 503,
    });
  }

  const webhookId = env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId) {
    throw new AppError({
      code: ERROR_CODE.INTERNAL_SERVER_ERROR,
      message: "PAYPAL_WEBHOOK_ID is not configured",
      statusCode: 503,
    });
  }

  const rawBody = await request.text();
  const valid = await verifyPayPalWebhookSignature({
    headers: request.headers,
    rawBody,
    webhookId,
  });

  if (!valid) {
    throw new AppError({
      code: ERROR_CODE.UNAUTHORIZED,
      message: "Invalid PayPal webhook signature",
      statusCode: 401,
    });
  }

  const event = JSON.parse(rawBody) as {
    id?: string;
    event_type?: string;
    resource?: {
      id?: string;
      status?: string;
      amount?: { currency_code?: string; value?: string };
      supplementary_data?: {
        related_ids?: { order_id?: string };
      };
      custom_id?: string;
    };
  };

  const eventType = event.event_type ?? "";
  const resource = event.resource;
  const paypalOrderId =
    resource?.supplementary_data?.related_ids?.order_id ?? resource?.id;
  const captureId =
    eventType.startsWith("PAYMENT.CAPTURE") ? resource?.id : undefined;

  let result: unknown = { ignored: true, eventType };

  if (
    (eventType === "PAYMENT.CAPTURE.COMPLETED" ||
      eventType === "CHECKOUT.ORDER.APPROVED") &&
    paypalOrderId
  ) {
    const existing = await orderRepository.findByPaypalOrderId(paypalOrderId);
    if (existing) {
      const amountMinor = resource?.amount?.value
        ? payPalValueToMinor(resource.amount.value)
        : existing.grandTotalAmount;
      const currency = (
        resource?.amount?.currency_code ?? existing.currency
      ).toUpperCase();

      result = await paymentWebhookService.process("PAYPAL", {
        eventId: event.id ?? `${eventType}:${paypalOrderId}`,
        eventType: "payment.succeeded",
        orderId: existing.id,
        providerPaymentId: captureId ?? paypalOrderId,
        amount: amountMinor,
        currency,
        payload: resource as unknown as Record<string, unknown>,
      });
    } else if (eventType === "PAYMENT.CAPTURE.COMPLETED" && captureId) {
      const orderResource = await getPayPalOrder(paypalOrderId);
      const unit = orderResource.purchase_units?.[0];
      const capture = unit?.payments?.captures?.[0];
      const amountValue = capture?.amount?.value ?? unit?.amount?.value;
      const currencyCode =
        capture?.amount?.currency_code ?? unit?.amount?.currency_code;
      if (amountValue && currencyCode && capture?.id) {
        const metadataSource =
          (unit?.custom_id?.includes("customer")
            ? "customer_checkout"
            : "guest_checkout") as "guest_checkout" | "customer_checkout";

        try {
          const finalized = await finalizePaidPaypalCheckout({
            paypalOrderId,
            paypalCaptureId: capture.id,
            amountMinor: payPalValueToMinor(amountValue),
            currency: currencyCode,
            source: metadataSource,
            metadata: {
              source: metadataSource,
              recoveredFromWebhook: "true",
            },
          });
          result = {
            recovered: true,
            orderId: finalized.id,
            orderNumber: finalized.orderNumber,
            paypalOrderId,
          };
        } catch {
          result = {
            ignored: true,
            reason: "finalize_failed_or_snapshot_missing",
            paypalOrderId,
          };
        }
      }
    }
  } else if (
    (eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.CAPTURE.DECLINED") &&
    paypalOrderId
  ) {
    const existing = await orderRepository.findByPaypalOrderId(paypalOrderId);
    if (existing) {
      result = await paymentWebhookService.process("PAYPAL", {
        eventId: event.id ?? `${eventType}:${paypalOrderId}`,
        eventType: "payment.failed",
        orderId: existing.id,
        providerPaymentId: captureId ?? paypalOrderId,
        amount: existing.grandTotalAmount,
        currency: existing.currency,
        payload: resource as unknown as Record<string, unknown>,
      });
    }
  }

  return NextResponse.json({ data: result }, { status: 200 });
});
