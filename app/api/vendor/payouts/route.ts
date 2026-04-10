import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorFinanceService } from "@/services/vendor-finance.service";

const vendorFinanceService = new VendorFinanceService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const result = await vendorFinanceService.listPayouts(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
