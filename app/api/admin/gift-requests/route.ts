import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { GiftRequestService } from "@/services/gift-request.service";
import { adminGiftRequestListQuerySchema } from "@/validators/gift-request.validator";
import { parseQuery } from "@/validators/request";

const giftRequestService = new GiftRequestService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const query = parseQuery(request, adminGiftRequestListQuerySchema);
    const result = await giftRequestService.listForAdmin({
      status: query.status,
      search: query.search,
    });
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
