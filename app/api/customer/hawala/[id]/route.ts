import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { HawalaTransferService } from "@/services/hawala-transfer.service";
import { hawalaTransferIdParamsSchema } from "@/validators/hawala.validator";
import { parseParams } from "@/validators/request";

const hawalaTransferService = new HawalaTransferService();

export const GET = withErrorHandling(
  withRbac(["CUSTOMER"], async (_request, context) => {
    const params = parseParams(await context.params, hawalaTransferIdParamsSchema);
    const result = await hawalaTransferService.getForCustomer(context.auth, params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
