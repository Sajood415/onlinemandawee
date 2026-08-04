import { NextResponse } from "next/server";

import { isPayPalConfigured } from "@/lib/paypal/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { GiftRequestService } from "@/services/gift-request.service";
import {
  confirmGiftRequestPayPalPaymentSchema,
  giftRequestIdParamsSchema,
} from "@/validators/gift-request.validator";
import { parseBody, parseParams } from "@/validators/request";

const giftRequestService = new GiftRequestService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: { code: "CONFIG_ERROR", message: "PayPal is not configured." } },
        { status: 503 }
      );
    }

    const params = parseParams(await context.params, giftRequestIdParamsSchema);
    const input = await parseBody(request, confirmGiftRequestPayPalPaymentSchema);
    const result = await giftRequestService.confirmPayPalPaymentForCustomer(
      context.auth,
      params.id,
      input.paypalOrderId
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
