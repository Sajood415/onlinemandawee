import { NextResponse } from "next/server";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminNotificationService } from "@/services/admin-notification.service";

const service = new AdminNotificationService();

export const GET = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const data = await service.unreadCount(context.auth);
    return NextResponse.json({ data }, { status: 200 });
  })
);
