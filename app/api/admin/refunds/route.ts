import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { RefundService } from "@/services/refund.service";
import { adminRefundListQuerySchema } from "@/validators/refund.validator";
import { parseQuery } from "@/validators/request";

const refundService = new RefundService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    // Move late Mandawee-shop cases into Needs you before listing (no admin button).
    try {
      await refundService.runOverdueEscalation({
        actorUserId: context.auth.id,
        actorRole: context.auth.role,
      });
    } catch {
      // Listing should still work if the catch-up job fails.
    }

    const query = parseQuery(request, adminRefundListQuerySchema);
    const result = await refundService.listAdminCases(context.auth, {
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      vendorProfileId: query.vendorProfileId,
      search: query.search,
      from: query.from,
      to: query.to,
      overdueOnly: query.overdueOnly,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
