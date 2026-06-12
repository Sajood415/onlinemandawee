import { NextResponse } from "next/server";
import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { MembershipBillingService } from "@/services/membership-billing.service";
import { parseBody, parseParams } from "@/validators/request";

const membershipBillingService = new MembershipBillingService();
const invoiceIdParamsSchema = z.object({ id: z.string().min(1) });
const waiveBodySchema = z.object({
  reason: z.string().trim().min(3).max(200).optional(),
});

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const { id: invoiceId } = parseParams(
      await context.params,
      invoiceIdParamsSchema
    );
    const body = await parseBody(request, waiveBodySchema);
    const invoice = await membershipBillingService.waiveInvoice(
      invoiceId,
      body.reason
    );

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
