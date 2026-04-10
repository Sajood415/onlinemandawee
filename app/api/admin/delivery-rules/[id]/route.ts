import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminDeliveryService } from "@/services/admin-delivery.service";
import {
  deliveryRuleIdParamsSchema,
  deliveryRuleSchema,
} from "@/validators/delivery.validator";
import { parseBody, parseParams } from "@/validators/request";

const adminDeliveryService = new AdminDeliveryService();

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, deliveryRuleIdParamsSchema);
    const input = await parseBody(request, deliveryRuleSchema);
    const result = await adminDeliveryService.updateRule(
      params.id,
      input,
      context.auth
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
