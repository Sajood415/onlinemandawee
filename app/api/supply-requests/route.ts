import { NextResponse } from "next/server";

import { getOptionalAuthenticatedUser } from "@/lib/auth/optional-auth";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { SupplyRequestService } from "@/services/supply-request.service";
import { createSupplyRequestSchema } from "@/validators/supply-request.validator";
import { parseBody } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, createSupplyRequestSchema);
  const auth = await getOptionalAuthenticatedUser(request);
  const result = await supplyRequestService.create(input, auth?.id);

  return NextResponse.json({ data: result }, { status: 201 });
});
