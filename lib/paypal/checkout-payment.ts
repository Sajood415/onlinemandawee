import "server-only";

import { normalizeCurrency } from "@/lib/currency/constants";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { paypalFetch } from "@/lib/paypal/server";

export type PayPalOrderResource = {
  id: string;
  status: string;
  purchase_units?: Array<{
    amount?: { currency_code?: string; value?: string };
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
    custom_id?: string;
  }>;
};

function minorToPayPalValue(amountMinor: number) {
  return (amountMinor / 100).toFixed(2);
}

function payPalValueToMinor(value: string) {
  return Math.round(Number(value) * 100);
}

export async function createPayPalOrder(input: {
  amountMinor: number;
  currency: string;
  customId: string;
  description: string;
  invoiceId: string;
}) {
  const currency = normalizeCurrency(input.currency);
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: minorToPayPalValue(input.amountMinor),
        },
        description: input.description.slice(0, 127),
        custom_id: input.customId.slice(0, 127),
        invoice_id: input.invoiceId.slice(0, 127),
      },
    ],
  };

  return paypalFetch<PayPalOrderResource>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey: `create:${input.invoiceId}`,
  });
}

export async function getPayPalOrder(orderId: string) {
  return paypalFetch<PayPalOrderResource>(`/v2/checkout/orders/${orderId}`, {
    method: "GET",
  });
}

export async function capturePayPalOrder(orderId: string) {
  return paypalFetch<PayPalOrderResource>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    body: JSON.stringify({}),
    idempotencyKey: `capture:${orderId}`,
  });
}

export function assertPayPalOrderPaid(
  order: PayPalOrderResource,
  expected: { amountMinor: number; currency: string }
) {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const currency = normalizeCurrency(expected.currency);
  const paidCurrency = (
    capture?.amount?.currency_code ?? unit?.amount?.currency_code ?? ""
  ).toUpperCase();
  const paidValue = capture?.amount?.value ?? unit?.amount?.value;
  const paidMinor = paidValue ? payPalValueToMinor(paidValue) : NaN;

  const captureOk =
    capture?.status === "COMPLETED" ||
    capture?.status === "PENDING" ||
    order.status === "COMPLETED";

  if (!captureOk) {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "PayPal payment has not been completed",
      statusCode: 400,
    });
  }

  if (paidCurrency !== currency || paidMinor !== expected.amountMinor) {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "PayPal payment amount/currency does not match the order",
      statusCode: 400,
    });
  }

  if (!capture?.id) {
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message: "PayPal capture id missing",
      statusCode: 400,
    });
  }

  return { captureId: capture.id, amountMinor: paidMinor, currency };
}

export async function getPayPalCapture(captureId: string) {
  return paypalFetch<{
    id: string;
    status: string;
    amount?: { currency_code?: string; value?: string };
  }>(`/v2/payments/captures/${captureId}`, { method: "GET" });
}

export async function getPayPalCaptureRefundableBalance(captureId: string) {
  const capture = await getPayPalCapture(captureId);
  const charged = capture.amount?.value
    ? payPalValueToMinor(capture.amount.value)
    : 0;

  if (capture.status === "REFUNDED") {
    return { charged, alreadyRefunded: charged, remaining: 0 };
  }

  // PayPal does not always expose refunded totals on the capture.
  // Callers should pass a local already-refunded estimate when needed.
  return {
    charged,
    alreadyRefunded: 0,
    remaining: charged,
    status: capture.status,
  };
}

export async function refundPayPalCapture(input: {
  captureId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  note?: string;
}) {
  const currency = normalizeCurrency(input.currency);
  return paypalFetch<{ id: string; status: string }>(
    `/v2/payments/captures/${input.captureId}/refund`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: {
          value: minorToPayPalValue(input.amountMinor),
          currency_code: currency,
        },
        note_to_payer: input.note?.slice(0, 255),
      }),
      idempotencyKey: input.idempotencyKey,
    }
  );
}

export async function verifyPayPalWebhookSignature(input: {
  headers: Headers;
  rawBody: string;
  webhookId: string;
}) {
  const transmissionId = input.headers.get("paypal-transmission-id");
  const transmissionTime = input.headers.get("paypal-transmission-time");
  const certUrl = input.headers.get("paypal-cert-url");
  const authAlgo = input.headers.get("paypal-auth-algo");
  const transmissionSig = input.headers.get("paypal-transmission-sig");

  if (
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    return false;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(input.rawBody);
  } catch {
    return false;
  }

  const result = await paypalFetch<{ verification_status: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: input.webhookId,
        webhook_event: webhookEvent,
      }),
    }
  );

  return result.verification_status === "SUCCESS";
}
