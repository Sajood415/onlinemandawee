import { NextResponse } from "next/server";

import { consumeRateLimit } from "@/lib/http/simple-rate-limit";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { GuestOrderTrackingService } from "@/services/guest-order-tracking.service";
import { guestOrderTrackingTokenParamsSchema } from "@/validators/guest-order-tracking.validator";
import { parseParams } from "@/validators/request";

const guestOrderTrackingService = new GuestOrderTrackingService();

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const GET = withErrorHandling(async (request, context) => {
  const params = parseParams(await context.params, guestOrderTrackingTokenParamsSchema);
  const ip = getClientIp(request);
  const limit = consumeRateLimit(`guest-track:${ip}`, 60, 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again shortly." } },
      { status: 429 }
    );
  }

  const order = await guestOrderTrackingService.getOrderByTrackingToken(params.token);
  return NextResponse.json({ data: { order } }, { status: 200 });
});
