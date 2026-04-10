import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { OrderService } from "@/services/order.service";
import {
  orderIdParamsSchema,
  vendorOrderStatusSchema,
} from "@/validators/order.validator";
import { parseBody, parseParams } from "@/validators/request";

const orderService = new OrderService();

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const params = parseParams(await context.params, orderIdParamsSchema);
    const input = await parseBody(request, vendorOrderStatusSchema);
    const result = await orderService.updateVendorOrderStatus(
      context.auth,
      params.id,
      input.status
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
