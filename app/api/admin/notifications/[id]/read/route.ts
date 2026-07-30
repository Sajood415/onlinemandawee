import { NextResponse } from "next/server";
import { z } from "zod";

import { withErrorHandling } from "@/middlewares/with-error-handling";
import { withRbac } from "@/middlewares/with-rbac";
import { AdminNotificationService } from "@/services/admin-notification.service";
import { parseParams } from "@/validators/request";

const service = new AdminNotificationService();

const notificationIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const POST = withErrorHandling(
  withRbac(["ADMIN"], async (_request, context) => {
    const params = parseParams(await context.params, notificationIdParamsSchema);
    const data = await service.markRead(context.auth, params.id);
    return NextResponse.json({ data }, { status: 200 });
  })
);
