import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { RefundService } from "@/services/refund.service";
import { refundRequestSchema } from "@/validators/refund.validator";
import { parseBody } from "@/validators/request";

const refundService = new RefundService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, refundRequestSchema);
    const result = await refundService.requestRefund(context.auth, input);

    return NextResponse.json({ data: result }, { status: 201 });
  })
);
