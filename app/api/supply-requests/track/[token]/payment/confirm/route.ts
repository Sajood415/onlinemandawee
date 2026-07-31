import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { SupplyRequestService } from "@/services/supply-request.service";
import {
  confirmSupplyRequestPaymentSchema,
  supplyRequestTrackTokenParamsSchema,
} from "@/validators/supply-request.validator";
import { parseBody, parseParams } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const POST = withErrorHandling(async (request, context) => {
  const params = parseParams(
    await context.params,
    supplyRequestTrackTokenParamsSchema
  );
  const input = await parseBody(request, confirmSupplyRequestPaymentSchema);
  const result = await supplyRequestService.confirmPaymentByTrackToken(
    params.token,
    input.paymentIntentId
  );
  return NextResponse.json({ data: result }, { status: 200 });
});
