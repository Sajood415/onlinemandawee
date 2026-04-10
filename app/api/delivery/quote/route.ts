import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { DeliveryService } from "@/services/delivery.service";
import { deliveryQuoteSchema } from "@/validators/delivery.validator";
import { parseBody } from "@/validators/request";

const deliveryService = new DeliveryService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, deliveryQuoteSchema);
    const result = await deliveryService.quote(context.auth, input);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
