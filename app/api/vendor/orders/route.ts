import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { OrderService } from "@/services/order.service";

const orderService = new OrderService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const result = await orderService.listVendorOrders(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
