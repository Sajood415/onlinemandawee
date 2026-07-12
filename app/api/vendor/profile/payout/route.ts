import { NextResponse } from "next/server";
import { z } from "zod";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProfileService } from "@/services/vendor-profile.service";
import { parseBody } from "@/validators/request";

const profilePayoutSchema = z.object({
  method: z.literal("BANK"),
  accountName: z.string().trim().min(2).max(120),
  accountNumberOrIban: z.string().trim().min(5).max(80),
  bankName: z.string().trim().min(2).max(120),
});

const vendorProfileService = new VendorProfileService();

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, profilePayoutSchema);
    const result = await vendorProfileService.updatePayoutMethod(context.auth, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
