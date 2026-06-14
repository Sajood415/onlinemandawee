import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { GiftRequestService } from "@/services/gift-request.service";
import {
  giftRequestIdParamsSchema,
  sendGiftRequestQuoteSchema,
} from "@/validators/gift-request.validator";
import { parseBody, parseParams } from "@/validators/request";

const giftRequestService = new GiftRequestService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, giftRequestIdParamsSchema);
    const input = await parseBody(request, sendGiftRequestQuoteSchema);
    const result = await giftRequestService.sendQuoteForAdmin(params.id, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
