import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { RefundService } from "@/services/refund.service";
import { adminOrderIdParamsSchema } from "@/validators/admin-order.validator";
import { adminOrderFlagDisputeSchema } from "@/validators/refund.validator";
import { parseBody, parseParams } from "@/validators/request";

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const refundService = new RefundService();
    const params = parseParams(await context.params, adminOrderIdParamsSchema);
    const input = await parseBody(request, adminOrderFlagDisputeSchema);
    const result = await refundService.adminFlagOrderForDispute(
      context.auth,
      params.id,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
