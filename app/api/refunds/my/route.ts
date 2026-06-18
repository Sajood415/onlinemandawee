import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { RefundService } from "@/services/refund.service";
import { refundListQuerySchema } from "@/validators/refund.validator";
import { parseQuery } from "@/validators/request";

const refundService = new RefundService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const query = parseQuery(request, refundListQuerySchema);
    const result = await refundService.listMyCases(context.auth, {
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      search: query.search,
      from: query.from,
      to: query.to,
      overdueOnly: query.overdueOnly,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
