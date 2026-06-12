import { NextResponse } from "next/server";
import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { VendorSubscriptionService } from "@/services/vendor-subscription.service";
import { parseBody } from "@/validators/request";

const vendorProfileRepository = new VendorProfileRepository();
const vendorSubscriptionService = new VendorSubscriptionService();

const vendorSubscriptionActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_setup_intent"),
  }),
  z.object({
    action: z.literal("finalize_setup_intent"),
    setupIntentId: z.string().min(1),
  }),
  z.object({
    action: z.literal("create_portal_session"),
    returnUrl: z.url().min(1),
  }),
]);

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const vendor = await vendorProfileRepository.findByUserId(context.auth.id);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    const status = await vendorSubscriptionService.getStatusForVendorUser(context.auth.id);

    return NextResponse.json({ data: status }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, vendorSubscriptionActionSchema);

    if (input.action === "create_setup_intent") {
      const result = await vendorSubscriptionService.createSetupIntentForVendorUser(
        context.auth.id
      );
      return NextResponse.json({ data: result }, { status: 200 });
    }

    if (input.action === "finalize_setup_intent") {
      const result = await vendorSubscriptionService.finalizeSetupIntentForVendorUser(
        context.auth.id,
        input.setupIntentId
      );
      return NextResponse.json({ data: result }, { status: 200 });
    }

    const result = await vendorSubscriptionService.createBillingPortalSessionForVendorUser(
      context.auth.id,
      input.returnUrl
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
