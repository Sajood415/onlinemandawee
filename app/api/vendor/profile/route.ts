import { NextResponse } from "next/server";
import { z } from "zod";

import { businessTypes } from "@/domain/vendor/vendor-types";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorProfileService } from "@/services/vendor-profile.service";
import { parseBody } from "@/validators/request";

const updateBusinessInfoSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  businessType: z.enum(businessTypes),
  logoUrl: z.url().max(2048).optional(),
  description: z.string().trim().max(500).optional(),
});

const vendorProfileService = new VendorProfileService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const result = await vendorProfileService.getProfile(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, updateBusinessInfoSchema);
    const result = await vendorProfileService.updateBusinessInfo(context.auth, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
