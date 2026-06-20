import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { PlatformSettingsService } from "@/services/platform-settings.service";

export const GET = withErrorHandling(async () => {
  const platformSettingsService = new PlatformSettingsService();
  const result = await platformSettingsService.get();
  return NextResponse.json({ data: result }, { status: 200 });
});
