import { NextResponse } from "next/server";
import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { MembershipBillingService } from "@/services/membership-billing.service";
import { parseParams } from "@/validators/request";

const membershipBillingService = new MembershipBillingService();
const invoiceIdParamsSchema = z.object({ id: z.string().min(1) });

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const { id: invoiceId } = parseParams(
      await context.params,
      invoiceIdParamsSchema
    );
    const invoice = await membershipBillingService.markInvoicePaid(invoiceId);

    if (!invoice) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Membership invoice not found",
        statusCode: 404,
      });
    }

    return NextResponse.json({ data: invoice }, { status: 200 });
  })
);
