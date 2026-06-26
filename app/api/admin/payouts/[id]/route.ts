import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminPayoutService } from "@/services/admin-payout.service";
import { payoutIdParamsSchema } from "@/validators/payment.validator";
import { parseParams } from "@/validators/request";

const adminPayoutService = new AdminPayoutService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const { id } = parseParams(await context.params, payoutIdParamsSchema);
    const data = await adminPayoutService.getDetail(id);
    return NextResponse.json({ data }, { status: 200 });
  })
);
