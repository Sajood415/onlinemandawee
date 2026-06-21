import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { parseBody, parseParams } from "@/validators/request";
import {
  inboundShipOrderParamsSchema,
  vendorInboundShipSchema,
} from "@/validators/standard-consolidation.validator";
import { StandardConsolidationService } from "@/services/standard-consolidation.service";

const standardConsolidationService = new StandardConsolidationService();

export const POST = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const params = parseParams(await context.params, inboundShipOrderParamsSchema);
    const input = await parseBody(request, vendorInboundShipSchema);

    const result = await standardConsolidationService.markVendorOrderInboundShipped(
      context.auth,
      params.id,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
