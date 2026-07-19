import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { parseQuery } from "@/validators/request";
import { adminOutboundShipmentListQuerySchema } from "@/validators/admin-warehouse.validator";
import { AdminWarehouseService } from "@/services/admin-warehouse.service";

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const query = parseQuery(request, adminOutboundShipmentListQuerySchema);
    const adminWarehouseService = new AdminWarehouseService();
    const result = await adminWarehouseService.listOutboundShipments({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      search: query.search,
    });
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
