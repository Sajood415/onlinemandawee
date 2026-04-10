import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminDeliveryService } from "@/services/admin-delivery.service";
import { deliveryRuleSchema } from "@/validators/delivery.validator";
import { parseBody } from "@/validators/request";

const adminDeliveryService = new AdminDeliveryService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    const result = await adminDeliveryService.listRules();
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const input = await parseBody(request, deliveryRuleSchema);
    const result = await adminDeliveryService.createRule(input, context.auth);
    return NextResponse.json({ data: result }, { status: 201 });
  })
);
