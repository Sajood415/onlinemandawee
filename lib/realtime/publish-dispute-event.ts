import type { DisputeBroadcastBody } from "@/domain/realtime/dispute-events";
import { env } from "@/config/env.shared";

export async function publishDisputeEvent(body: DisputeBroadcastBody) {
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
        `[realtime] publish failed (${response.status}) for room ${body.room} event ${body.event}`
      );
    }
  } catch (error) {
    console.error("[realtime] publish error:", error);
  }
}
