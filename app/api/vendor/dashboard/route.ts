import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorDashboardService } from "@/services/vendor-dashboard.service";

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (_request, context) => {
    const result = await new VendorDashboardService().getSummary(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
