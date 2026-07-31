import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { SupplyRequestService } from "@/services/supply-request.service";
import { adminSupplyRequestListQuerySchema } from "@/validators/supply-request.validator";
import { parseQuery } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const query = parseQuery(request, adminSupplyRequestListQuerySchema);
    const result = await supplyRequestService.listForAdmin({
      status: query.status,
      search: query.search,
    });
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
