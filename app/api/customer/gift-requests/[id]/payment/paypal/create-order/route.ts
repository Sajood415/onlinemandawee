import { NextResponse } from "next/server";

import { isPayPalConfigured } from "@/lib/paypal/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { GiftRequestService } from "@/services/gift-request.service";
import { giftRequestIdParamsSchema } from "@/validators/gift-request.validator";
import { parseParams } from "@/validators/request";

const giftRequestService = new GiftRequestService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIG_ERROR",
            message: "PayPal is not configured.",
          },
        },
        { status: 503 }
      );
    }

    const params = parseParams(await context.params, giftRequestIdParamsSchema);
    const result = await giftRequestService.createPayPalOrderForCustomer(
      context.auth,
      params.id
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
