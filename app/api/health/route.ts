import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { HealthService } from "@/services/health.service";

const healthService = new HealthService();

export const GET = withErrorHandling(async () => {
  const status = await healthService.getStatus();
  return NextResponse.json({ data: status }, { status: 200 });
});
