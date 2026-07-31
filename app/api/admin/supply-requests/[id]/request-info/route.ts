import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { SupplyRequestService } from "@/services/supply-request.service";
import {
  requestSupplyInfoSchema,
  supplyRequestIdParamsSchema,
} from "@/validators/supply-request.validator";
import { parseBody, parseParams } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, supplyRequestIdParamsSchema);
    const input = await parseBody(request, requestSupplyInfoSchema);
    const result = await supplyRequestService.requestInfoForAdmin(
      params.id,
      input.message
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
