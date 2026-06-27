import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { RefundService } from "@/services/refund.service";
import {
  adminRefundStatusSchema,
  refundCaseIdParamsSchema,
} from "@/validators/refund.validator";
import { parseBody, parseParams } from "@/validators/request";

const refundService = new RefundService();

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, refundCaseIdParamsSchema);
    const input = await parseBody(request, adminRefundStatusSchema);
    const result = await refundService.adminUpdateStatus(
      context.auth,
      params.id,
      input.status
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
