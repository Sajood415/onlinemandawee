import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminHomeBannerService } from "@/services/admin-home-banner.service";
import { createHomeBannerSchema } from "@/validators/home-banner.validator";
import { parseBody } from "@/validators/request";

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async () => {
    const result = await new AdminHomeBannerService().list();
    return NextResponse.json({ data: result }, { status: 200 });
  })
);

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const input = await parseBody(request, createHomeBannerSchema);
    const result = await new AdminHomeBannerService().create(context.auth, input);
    return NextResponse.json({ data: result }, { status: 201 });
  })
);
