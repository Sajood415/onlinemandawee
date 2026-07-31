import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { SupplyRequestService } from "@/services/supply-request.service";
import { supplyRequestTrackQuerySchema } from "@/validators/supply-request.validator";
import { parseQuery } from "@/validators/request";

const supplyRequestService = new SupplyRequestService();

export const GET = withErrorHandling(async (request) => {
  const query = parseQuery(request, supplyRequestTrackQuerySchema);
  const result = await supplyRequestService.getByTrackToken(query.token);
  return NextResponse.json({ data: result }, { status: 200 });
});
