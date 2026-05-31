import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorCouponService } from "@/services/vendor-coupon.service";
import { couponIdParamsSchema, updateVendorCouponSchema } from "@/validators/coupon.validator";
import { parseBody, parseParams } from "@/validators/request";

const vendorCouponService = new VendorCouponService();

export const PATCH = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const params = parseParams(await context.params, couponIdParamsSchema);
    const input = await parseBody(request, updateVendorCouponSchema);
    const result = await vendorCouponService.update(context.auth, params.id, input);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
