import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { OrderService } from "@/services/order.service";
import { createOrderSchema } from "@/validators/order.validator";
import { parseBody } from "@/validators/request";

const orderService = new OrderService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, createOrderSchema);
    const result = await orderService.createOrder(context.auth, input);

    return NextResponse.json({ data: result }, { status: 201 });
  })
);
