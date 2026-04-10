import { NextResponse } from "next/server";

import { withRbac } from "@/middlewares/with-rbac";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { RefundService } from "@/services/refund.service";
import {
  adminRefundDecisionSchema,
  refundCaseIdParamsSchema,
} from "@/validators/refund.validator";
import { parseBody, parseParams } from "@/validators/request";

const refundService = new RefundService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, refundCaseIdParamsSchema);
    const input = await parseBody(request, adminRefundDecisionSchema);
    const result = await refundService.adminDecision(
      context.auth,
      params.id,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
