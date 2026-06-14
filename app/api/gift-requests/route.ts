import { NextResponse } from "next/server";

import { getOptionalAuthenticatedUser } from "@/lib/auth/optional-auth";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { GiftRequestService } from "@/services/gift-request.service";
import { createGiftRequestSchema } from "@/validators/gift-request.validator";
import { parseBody } from "@/validators/request";

const giftRequestService = new GiftRequestService();

export const POST = withErrorHandling(async (request) => {
  const input = await parseBody(request, createGiftRequestSchema);
  const auth = await getOptionalAuthenticatedUser(request);
  const result = await giftRequestService.create(input, auth?.id);

  return NextResponse.json({ data: result }, { status: 201 });
});
