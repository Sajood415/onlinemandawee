import {
  ADMIN_NOTIFICATIONS_ROOM,
  type AdminNotificationType,
} from "@/domain/admin/notification-types";
import { publishAdminNotificationEvent } from "@/lib/realtime/publish-admin-notification";
import { AdminNotificationRepository } from "@/repositories/admin-notification.repository";

const repository = new AdminNotificationRepository();

export type NotifyAdminsInput = {
  type: AdminNotificationType;
  title: string;
  body: string;
  href: string;
  entityType?: string | null;
  entityId?: string | null;
};

/**
 * Persist + broadcast an admin notification.
 * Never throws into the caller business flow.
 */
export async function notifyAdmins(input: NotifyAdminsInput): Promise<void> {
  try {
    const created = await repository.create({
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      entityType: input.entityType,
      entityId: input.entityId,
    });

    await publishAdminNotificationEvent({
      room: ADMIN_NOTIFICATIONS_ROOM,
      event: "admin.notification.created",
      payload: {
        id: created.id,
        type: created.type,
        title: created.title,
        body: created.body,
        href: created.href,
        entityType: created.entityType,
        entityId: created.entityId,
        createdAt: created.createdAt.toISOString(),
        read: false,
      },
    });
  } catch (error) {
    console.error("[admin-notifications] notifyAdmins failed:", error);
  }
}
