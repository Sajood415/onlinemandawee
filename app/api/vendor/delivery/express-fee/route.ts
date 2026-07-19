import { NextResponse } from "next/server";
import { z } from "zod";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorExpressDeliveryService } from "@/services/vendor-express-delivery.service";
import { parseBody } from "@/validators/request";

const setExpressFeeSchema = z.object({
  feeAmountMinor: z.number().int().min(0).max(500_00),
  isActive: z.boolean().optional(),
});

const vendorExpressDeliveryService = new VendorExpressDeliveryService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const result = await vendorExpressDeliveryService.getExpressFee(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, setExpressFeeSchema);
    const result = await vendorExpressDeliveryService.setExpressFee(context.auth, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
