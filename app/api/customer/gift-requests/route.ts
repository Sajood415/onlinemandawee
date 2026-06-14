import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { GiftRequestService } from "@/services/gift-request.service";

const giftRequestService = new GiftRequestService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const result = await giftRequestService.listForCustomer(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
