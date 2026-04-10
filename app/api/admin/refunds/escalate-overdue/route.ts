import { NextResponse } from "next/server";

import { withRbac } from "@/middlewares/with-rbac";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { RefundService } from "@/services/refund.service";

const refundService = new RefundService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const result = await refundService.escalateOverdue(context.auth);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
