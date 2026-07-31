import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { SupplyRequestService } from "@/services/supply-request.service";
import { supplyRequestTrackTokenParamsSchema } from "@/validators/supply-request.validator";
import { parseParams } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const POST = withErrorHandling(async (_request, context) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        error: {
          code: "CONFIG_ERROR",
          message:
            "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.",
        },
      },
      { status: 503 }
    );
  }

  const params = parseParams(
    await context.params,
    supplyRequestTrackTokenParamsSchema
  );
  const result = await supplyRequestService.createPaymentIntentByTrackToken(
    params.token
  );
  return NextResponse.json({ data: result }, { status: 200 });
});
