import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminPayoutService } from "@/services/admin-payout.service";

const adminPayoutService = new AdminPayoutService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    const data = await adminPayoutService.queues();
    return NextResponse.json({ data }, { status: 200 });
  })
);
