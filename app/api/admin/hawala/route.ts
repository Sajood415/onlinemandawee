import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { HawalaTransferService } from "@/services/hawala-transfer.service";
import { adminHawalaTransferListQuerySchema } from "@/validators/hawala.validator";
import { parseQuery } from "@/validators/request";

const hawalaTransferService = new HawalaTransferService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request) => {
    const query = parseQuery(request, adminHawalaTransferListQuerySchema);
    const result = await hawalaTransferService.listForAdmin({
      status: query.status,
      search: query.search,
    });
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
