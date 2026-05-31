import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorCouponService } from "@/services/vendor-coupon.service";
import { createVendorCouponSchema } from "@/validators/coupon.validator";
import { parseBody } from "@/validators/request";

const vendorCouponService = new VendorCouponService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const result = await vendorCouponService.list(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const input = await parseBody(request, createVendorCouponSchema);
    const result = await vendorCouponService.create(context.auth, input);
    return NextResponse.json({ data: result }, { status: 201 });
  })
);
