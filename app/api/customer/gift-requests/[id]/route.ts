import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { GiftRequestService } from "@/services/gift-request.service";
import { giftRequestIdParamsSchema } from "@/validators/gift-request.validator";
import { parseParams } from "@/validators/request";

const giftRequestService = new GiftRequestService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const params = parseParams(await context.params, giftRequestIdParamsSchema);
    const result = await giftRequestService.getForCustomer(context.auth, params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
