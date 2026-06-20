import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { PlatformSettingsService } from "@/services/platform-settings.service";
import { updatePlatformSettingsSchema } from "@/validators/platform-settings.validator";
import { parseBody } from "@/validators/request";

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    const platformSettingsService = new PlatformSettingsService();
    const result = await platformSettingsService.get();
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const platformSettingsService = new PlatformSettingsService();
    const input = await parseBody(request, updatePlatformSettingsSchema);
    const result = await platformSettingsService.update(context.auth, input);
    return NextResponse.json({ data: result }, { status: 200 });
  })
);
