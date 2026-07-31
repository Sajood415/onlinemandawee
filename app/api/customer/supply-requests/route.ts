import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { SupplyRequestService } from "@/services/supply-request.service";

const supplyRequestService = new SupplyRequestService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const result = await supplyRequestService.listForCustomer(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
