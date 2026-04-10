import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { OrderService } from "@/services/order.service";
import { orderIdParamsSchema } from "@/validators/order.validator";
import { parseParams } from "@/validators/request";

const orderService = new OrderService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const params = parseParams(await context.params, orderIdParamsSchema);
    const result = await orderService.getOrderForCustomer(
      context.auth,
      params.id
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
