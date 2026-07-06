import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { HawalaTransferService } from "@/services/hawala-transfer.service";
import {
  hawalaTransferIdParamsSchema,
  updateHawalaTransferStatusSchema,
} from "@/validators/hawala.validator";
import { parseBody, parseParams } from "@/validators/request";

const hawalaTransferService = new HawalaTransferService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, hawalaTransferIdParamsSchema);
    const result = await hawalaTransferService.getForAdmin(params.id);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, hawalaTransferIdParamsSchema);
    const input = await parseBody(request, updateHawalaTransferStatusSchema);
    const result = await hawalaTransferService.updateStatusForAdmin(
      context.auth,
      params.id,
      { status: input.status, adminNote: input.adminNote }
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
