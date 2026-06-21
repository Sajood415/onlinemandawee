import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { parseBody, parseParams } from "@/validators/request";
import {
  adminOutboundShipSchema,
  outboundShipmentParamsSchema,
} from "@/validators/standard-consolidation.validator";
import { StandardConsolidationService } from "@/services/standard-consolidation.service";

const standardConsolidationService = new StandardConsolidationService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, outboundShipmentParamsSchema);
    const input = await parseBody(request, adminOutboundShipSchema);
    const result = await standardConsolidationService.markOutboundShipmentShipped(
      context.auth,
      params.id,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
