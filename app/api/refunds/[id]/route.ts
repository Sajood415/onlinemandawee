import { NextResponse } from "next/server";

import { withAuth } from "@/middlewares/with-auth";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { RefundService } from "@/services/refund.service";
import { refundCaseIdParamsSchema } from "@/validators/refund.validator";
import { parseParams } from "@/validators/request";

const refundService = new RefundService();

export const GET = withErrorHandling(
  withAuth(async (_request, context) => {
    const params = parseParams(await context.params, refundCaseIdParamsSchema);
    const result = await refundService.getRefundCase(context.auth, params.id);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
