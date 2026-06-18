import { NextResponse } from "next/server";

import { consumeRateLimit } from "@/lib/http/simple-rate-limit";
import { withErrorHandling } from "@/middlewares/with-error-handling";
import { GuestOrderTrackingService } from "@/services/guest-order-tracking.service";
import { guestOrderLookupSchema } from "@/validators/guest-order-tracking.validator";

const guestOrderTrackingService = new GuestOrderTrackingService();

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const POST = withErrorHandling(async (request) => {
  const ip = getClientIp(request);
  const limit = consumeRateLimit(`guest-lookup:${ip}`, 10, 15 * 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many lookup attempts. Please try again later." } },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = guestOrderLookupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid order number and email.",
        },
      },
      { status: 400 }
    );
  }

  const result = await guestOrderTrackingService.lookupOrderByNumberAndEmail(parsed.data);
  return NextResponse.json({ data: result }, { status: 200 });
});
