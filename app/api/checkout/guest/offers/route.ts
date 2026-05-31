import { NextResponse } from "next/server";
import { z } from "zod";

import { listPublicVendorOffers } from "@/lib/checkout/list-public-vendor-offers";
import { withErrorHandling } from "@/middlewares/with-error-handling";

const offersBodySchema = z.object({
  vendorProfileIds: z.array(z.string().min(1)).min(1),
});

export const POST = withErrorHandling(async (request) => {
  const body = await request.json();
  const parsed = offersBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const offers = await listPublicVendorOffers(parsed.data.vendorProfileIds);
  return NextResponse.json({ data: offers }, { status: 200 });
});
