import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { safeEqual } from "@/lib/utils/crypto";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { PaymentWebhookService } from "@/services/payment-webhook.service";
import { paymentWebhookSchema } from "@/validators/payment.validator";

const paymentWebhookService = new PaymentWebhookService();

export const POST = withErrorHandling(async (request) => {
  const providedSecret = request.headers.get("x-webhook-secret");

  if (!providedSecret || !safeEqual(providedSecret, env.PAYPAL_WEBHOOK_SECRET)) {
    throw new AppError({
      code: ERROR_CODE.UNAUTHORIZED,
      message: "Invalid webhook secret",
      statusCode: 401,
    });
  }

  const rawBody = await request.text();
  const input = paymentWebhookSchema.parse(JSON.parse(rawBody));
  const result = await paymentWebhookService.process("PAYPAL", input);

  return NextResponse.json({ data: result }, { status: 200 });
});
