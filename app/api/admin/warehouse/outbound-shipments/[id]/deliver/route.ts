import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { parseParams } from "@/validators/request";
import { outboundShipmentParamsSchema } from "@/validators/standard-consolidation.validator";
import { StandardConsolidationService } from "@/services/standard-consolidation.service";

const standardConsolidationService = new StandardConsolidationService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, outboundShipmentParamsSchema);
    const result = await standardConsolidationService.markOutboundShipmentDelivered(
      context.auth,
      params.id
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
