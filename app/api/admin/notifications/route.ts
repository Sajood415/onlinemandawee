import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminNotificationService } from "@/services/admin-notification.service";

const service = new AdminNotificationService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (request, context) => {
    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
    const data = await service.listForAdmin(context.auth, limit);
    return NextResponse.json({ data }, { status: 200 });
  })
);
