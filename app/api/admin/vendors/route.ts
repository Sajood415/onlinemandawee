import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminVendorService } from "@/services/admin-vendor.service";
import { parseQuery } from "@/validators/request";
import { adminVendorListQuerySchema } from "@/validators/vendor.validator";

const adminVendorService = new AdminVendorService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const query = parseQuery(request, adminVendorListQuerySchema);
    const result = await adminVendorService.list(query.status);

    return NextResponse.json({ data: result }, { status: 200 });
  })
);
