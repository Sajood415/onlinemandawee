import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminOrderService } from "@/services/admin-order.service";
import { adminOrderIdParamsSchema } from "@/validators/admin-order.validator";
import { parseParams } from "@/validators/request";

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const adminOrderService = new AdminOrderService();
    const params = parseParams(await context.params, adminOrderIdParamsSchema);
    const result = await adminOrderService.detail(params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
