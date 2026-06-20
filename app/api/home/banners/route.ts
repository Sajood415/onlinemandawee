import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { AdminHomeBannerService } from "@/services/admin-home-banner.service";

export const GET = withErrorHandling(async () => {
  const result = await new AdminHomeBannerService().listActive();
  return NextResponse.json({ data: result }, { status: 200 });
});
