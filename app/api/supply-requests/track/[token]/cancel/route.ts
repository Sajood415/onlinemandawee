import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { SupplyRequestService } from "@/services/supply-request.service";
import { supplyRequestTrackTokenParamsSchema } from "@/validators/supply-request.validator";
import { parseParams } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const POST = withErrorHandling(async (_request, context) => {
  const params = parseParams(
    await context.params,
    supplyRequestTrackTokenParamsSchema
  );
  const result = await supplyRequestService.cancelByTrackToken(params.token);
  return NextResponse.json({ data: result }, { status: 200 });
});
