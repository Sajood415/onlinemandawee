import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { SupplyRequestService } from "@/services/supply-request.service";
import {
  supplyRequestIdParamsSchema,
  updateSupplyRequestStatusSchema,
} from "@/validators/supply-request.validator";
import { parseBody, parseParams } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, supplyRequestIdParamsSchema);
    const result = await supplyRequestService.getForAdmin(params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, supplyRequestIdParamsSchema);
    const input = await parseBody(request, updateSupplyRequestStatusSchema);
    const result = await supplyRequestService.updateStatusForAdmin(
      params.id,
      input.status
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
