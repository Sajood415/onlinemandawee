import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { SupplyRequestService } from "@/services/supply-request.service";
import {
  sendSupplyRequestQuoteSchema,
  supplyRequestIdParamsSchema,
} from "@/validators/supply-request.validator";
import { parseBody, parseParams } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, supplyRequestIdParamsSchema);
    const input = await parseBody(request, sendSupplyRequestQuoteSchema);
    const result = await supplyRequestService.sendQuoteForAdmin(params.id, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
