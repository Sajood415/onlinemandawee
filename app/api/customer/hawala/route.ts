import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { HawalaTransferService } from "@/services/hawala-transfer.service";

const hawalaTransferService = new HawalaTransferService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const result = await hawalaTransferService.listForCustomer(context.auth);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
