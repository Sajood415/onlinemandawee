import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { parseBody, parseParams } from "@/validators/request";
import {
  adminInboundShipSchema,
  inboundShipmentParamsSchema,
} from "@/validators/standard-consolidation.validator";
import { StandardConsolidationService } from "@/services/standard-consolidation.service";

const standardConsolidationService = new StandardConsolidationService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, inboundShipmentParamsSchema);
    const input = await parseBody(request, adminInboundShipSchema);

    const result = await standardConsolidationService.markInboundShipmentShippedAsAdmin(
      context.auth,
      params.id,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
