import { NextResponse } from "next/server";

import { isPayPalConfigured } from "@/lib/paypal/server";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { SupplyRequestService } from "@/services/supply-request.service";
import {
  confirmSupplyRequestPayPalPaymentSchema,
  supplyRequestIdParamsSchema,
} from "@/validators/supply-request.validator";
import { parseBody, parseParams } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const POST = withErrorHandling(
  withRbac(["CUSTOMER"], async (request, context) => {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        { error: { code: "CONFIG_ERROR", message: "PayPal is not configured." } },
        { status: 503 }
      );
    }

    const params = parseParams(await context.params, supplyRequestIdParamsSchema);
    const input = await parseBody(
      request,
      confirmSupplyRequestPayPalPaymentSchema
    );
    const result = await supplyRequestService.confirmPayPalPaymentForCustomer(
      context.auth,
      params.id,
      input.paypalOrderId
    );

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
