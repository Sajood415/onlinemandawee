import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminPayoutService } from "@/services/admin-payout.service";
import { releasePayoutSchema } from "@/validators/payment.validator";
import { parseBody } from "@/validators/request";

const adminPayoutService = new AdminPayoutService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const input = await parseBody(request, releasePayoutSchema);
    const result = await adminPayoutService.release(input, context.auth);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
