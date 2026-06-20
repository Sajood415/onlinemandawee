import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminOrderService } from "@/services/admin-order.service";
import { adminOrderListQuerySchema } from "@/validators/admin-order.validator";
import { parseQuery } from "@/validators/request";

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const adminOrderService = new AdminOrderService();
    const query = parseQuery(request, adminOrderListQuerySchema);
    const result = await adminOrderService.list({
      page: query.page,
      pageSize: query.pageSize,
      vendorProfileId: query.vendorProfileId,
      statusFilter: query.statusFilter,
      from: query.from,
      to: query.to,
      search: query.search,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
