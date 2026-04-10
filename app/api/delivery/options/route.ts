import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { DeliveryService } from "@/services/delivery.service";
import { parseBody } from "@/validators/request";
import { z } from "zod";

const deliveryService = new DeliveryService();
const deliveryOptionsSchema = z.object({
  addressId: z.string().min(1),
});

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    const input = await parseBody(request, deliveryOptionsSchema);
    const result = await deliveryService.listAvailableMethods(
      context.auth,
      input
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
