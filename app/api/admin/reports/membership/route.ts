import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminReportService } from "@/services/admin-report.service";
import { reportRangeQuerySchema } from "@/validators/report.validator";
import { parseQuery } from "@/validators/request";

const adminReportService = new AdminReportService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const query = parseQuery(request, reportRangeQuerySchema);
    const result = await adminReportService.membership(query);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
