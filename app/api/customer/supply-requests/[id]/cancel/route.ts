import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { SupplyRequestService } from "@/services/supply-request.service";
import { supplyRequestIdParamsSchema } from "@/validators/supply-request.validator";
import { parseParams } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const params = parseParams(await context.params, supplyRequestIdParamsSchema);
    const result = await supplyRequestService.cancelForCustomer(
      context.auth,
      params.id
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
