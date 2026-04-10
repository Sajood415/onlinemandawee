import { NextResponse } from "next/server";

import { withAuth } from "@/middlewares/with-auth";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { RefundService } from "@/services/refund.service";
import {
  refundCaseIdParamsSchema,
  refundMessageSchema,
} from "@/validators/refund.validator";
import { parseBody, parseParams } from "@/validators/request";

const refundService = new RefundService();

export const GET = withErrorHandling(
  withAuth(async (_request, context) => {
    const params = parseParams(await context.params, refundCaseIdParamsSchema);
    const result = await refundService.listMessages(context.auth, params.id);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withAuth(async (request, context) => {
    const params = parseParams(await context.params, refundCaseIdParamsSchema);
    const input = await parseBody(request, refundMessageSchema);
    const result = await refundService.addMessage(
      context.auth,
      params.id,
      input
    );

    return NextResponse.json({ data: result }, { status: 201 });
  })
);
