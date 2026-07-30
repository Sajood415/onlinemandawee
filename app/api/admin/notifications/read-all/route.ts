import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminNotificationService } from "@/services/admin-notification.service";

const service = new AdminNotificationService();

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const data = await service.markAllRead(context.auth);
    return NextResponse.json({ data }, { status: 200 });
  })
);
