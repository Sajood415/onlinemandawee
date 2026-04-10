import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { MembershipBillingService } from "@/services/membership-billing.service";
import { membershipInvoiceGenerationSchema } from "@/validators/report.validator";
import { parseOptionalBody } from "@/validators/request";

const membershipBillingService = new MembershipBillingService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const input = await parseOptionalBody(
      request,
      membershipInvoiceGenerationSchema,
      {}
    );
    const result = await membershipBillingService.generateMonthlyInvoices(input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
