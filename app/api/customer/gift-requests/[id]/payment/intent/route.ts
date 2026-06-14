import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { GiftRequestService } from "@/services/gift-request.service";
import { giftRequestIdParamsSchema } from "@/validators/gift-request.validator";
import { parseParams } from "@/validators/request";

const giftRequestService = new GiftRequestService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIG_ERROR",
            message: "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.",
          },
        },
        { status: 503 }
      );
    }

    const params = parseParams(await context.params, giftRequestIdParamsSchema);
    const result = await giftRequestService.createPaymentIntentForCustomer(
      context.auth,
      params.id
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
