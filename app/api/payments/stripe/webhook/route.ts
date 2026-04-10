import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { PaymentWebhookService } from "@/services/payment-webhook.service";
import { paymentWebhookSchema } from "@/validators/payment.validator";
import { parseBody } from "@/validators/request";

const paymentWebhookService = new PaymentWebhookService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, paymentWebhookSchema);
  const result = await paymentWebhookService.process("STRIPE", input);

  return NextResponse.json({ data: result }, { status: 200 });
});
