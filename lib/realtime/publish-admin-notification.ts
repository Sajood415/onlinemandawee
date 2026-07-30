import type { AdminNotificationBroadcastBody } from "@/domain/admin/notification-types";
import { env } from "@/config/env.shared";

export async function publishAdminNotificationEvent(
  body: AdminNotificationBroadcastBody
) {
  const publishUrl = env.REALTIME_PUBLISH_URL;
  const secret = env.REALTIME_INTERNAL_SECRET;

  if (!publishUrl || !secret) {
    return;
  }

  try {
    const response = await fetch(publishUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Realtime-Secret": secret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      console.error(
        `[realtime] admin notification publish failed (${response.status})`
      );
    }
  } catch (error) {
    console.error("[realtime] admin notification publish error:", error);
  }
}
