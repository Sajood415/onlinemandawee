import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { GiftRequestService } from "@/services/gift-request.service";
import {
  confirmGiftRequestPaymentSchema,
  giftRequestIdParamsSchema,
} from "@/validators/gift-request.validator";
import { parseBody, parseParams } from "@/validators/request";

const giftRequestService = new GiftRequestService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: { code: "CONFIG_ERROR", message: "Stripe is not configured." } },
        { status: 503 }
      );
    }

    const params = parseParams(await context.params, giftRequestIdParamsSchema);
    const input = await parseBody(request, confirmGiftRequestPaymentSchema);
    const result = await giftRequestService.confirmPaymentForCustomer(
      context.auth,
      params.id,
      input.paymentIntentId
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
