import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { GiftRequestService } from "@/services/gift-request.service";
import {
  giftRequestIdParamsSchema,
  updateGiftRequestStatusSchema,
} from "@/validators/gift-request.validator";
import { parseBody, parseParams } from "@/validators/request";

const giftRequestService = new GiftRequestService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, giftRequestIdParamsSchema);
    const result = await giftRequestService.getForAdmin(params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, giftRequestIdParamsSchema);
    const input = await parseBody(request, updateGiftRequestStatusSchema);
    const result = await giftRequestService.updateStatusForAdmin(params.id, input.status);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
