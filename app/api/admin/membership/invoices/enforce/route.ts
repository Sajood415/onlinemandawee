import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { MembershipBillingService } from "@/services/membership-billing.service";

const membershipBillingService = new MembershipBillingService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    const result = await membershipBillingService.enforceSubscriptionCompliance();
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
