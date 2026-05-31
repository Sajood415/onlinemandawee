import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorPromoBannerService } from "@/services/vendor-promo-banner.service";
import { createVendorPromoBannerSchema } from "@/validators/promo-banner.validator";
import { parseBody } from "@/validators/request";

const vendorPromoBannerService = new VendorPromoBannerService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const result = await vendorPromoBannerService.list(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, createVendorPromoBannerSchema);
    const result = await vendorPromoBannerService.create(context.auth, input);
    return NextResponse.json({ data: result }, { status: 201 });
  })
);
