import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { OrderService } from "@/services/order.service";
import { cancelOrderBodySchema, orderIdParamsSchema } from "@/validators/order.validator";
import { parseParams } from "@/validators/request";

const orderService = new OrderService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const params = parseParams(await context.params, orderIdParamsSchema);
    const body = await request.json().catch(() => ({}));
    const parsed = cancelOrderBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
        { status: 400 }
      );
    }

    const result = await orderService.cancelMyOrder(context.auth, params.id, {
      reason: parsed.data.reason,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
