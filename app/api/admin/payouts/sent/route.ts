import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminPayoutService } from "@/services/admin-payout.service";
import { markPayoutSentSchema } from "@/validators/payment.validator";
import { parseBody } from "@/validators/request";

const adminPayoutService = new AdminPayoutService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const input = await parseBody(request, markPayoutSentSchema);
    const result = await adminPayoutService.markSent(input, context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
