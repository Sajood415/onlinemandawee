import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { RefundService } from "@/services/refund.service";
import {
  adminUpdateRefundDecisionSchema,
  refundCaseIdParamsSchema,
} from "@/validators/refund.validator";
import { parseBody, parseParams } from "@/validators/request";

const refundService = new RefundService();

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, refundCaseIdParamsSchema);
    const input = await parseBody(request, adminUpdateRefundDecisionSchema);
    const result = await refundService.adminUpdateDecision(
      context.auth,
      params.id,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
