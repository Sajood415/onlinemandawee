import { NextResponse } from "next/server";

import { getOptionalAuthenticatedUser } from "@/lib/auth/optional-auth";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { HawalaTransferService } from "@/services/hawala-transfer.service";
import { createHawalaTransferSchema } from "@/validators/hawala.validator";
import { parseBody } from "@/validators/request";

const hawalaTransferService = new HawalaTransferService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, createHawalaTransferSchema);
  const auth = await getOptionalAuthenticatedUser(request);
  const result = await hawalaTransferService.create(input, auth?.id);

  return NextResponse.json({ data: result }, { status: 201 });
});
