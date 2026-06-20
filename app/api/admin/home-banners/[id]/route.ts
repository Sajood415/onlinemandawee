import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminHomeBannerService } from "@/services/admin-home-banner.service";
import {
  homeBannerIdParamsSchema,
  updateHomeBannerSchema,
} from "@/validators/home-banner.validator";
import { parseBody, parseParams } from "@/validators/request";

export const PATCH = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const params = parseParams(await context.params, homeBannerIdParamsSchema);
    const input = await parseBody(request, updateHomeBannerSchema);
    const result = await new AdminHomeBannerService().update(
      context.auth,
      params.id,
      input
    );
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const DELETE = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, homeBannerIdParamsSchema);
    await new AdminHomeBannerService().delete(context.auth, params.id);
    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  })
);
