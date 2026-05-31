import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorPromoBannerService } from "@/services/vendor-promo-banner.service";
import {
  promoBannerIdParamsSchema,
  updateVendorPromoBannerSchema,
} from "@/validators/promo-banner.validator";
import { parseBody, parseParams } from "@/validators/request";

const vendorPromoBannerService = new VendorPromoBannerService();

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const params = parseParams(await context.params, promoBannerIdParamsSchema);
    const input = await parseBody(request, updateVendorPromoBannerSchema);
    const result = await vendorPromoBannerService.update(context.auth, params.id, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const DELETE = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const params = parseParams(await context.params, promoBannerIdParamsSchema);
    await vendorPromoBannerService.delete(context.auth, params.id);
    return NextResponse.json({ data: { ok: true } }, { status: 200 });
  })
);
