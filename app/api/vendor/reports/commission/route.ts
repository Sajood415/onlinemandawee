import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { VendorReportService } from "@/services/vendor-report.service";
import { reportRangeQuerySchema } from "@/validators/report.validator";
import { parseQuery } from "@/validators/request";

const vendorReportService = new VendorReportService();

export const GET = withErrorHandling(
  withRbac(["VENDOR"], async (request, context) => {
    const query = parseQuery(request, reportRangeQuerySchema);
    const result = await vendorReportService.commission(context.auth, query);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
