import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { AdminNotificationRepository } from "@/repositories/admin-notification.repository";

const DEFAULT_LIST_LIMIT = 50;

export class AdminNotificationService {
  private readonly repository = new AdminNotificationRepository();

  private assertAdmin(auth: AuthenticatedUser) {
    if (auth.role !== "ADMIN") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Admin access required",
        statusCode: 403,
      });
    }
  }

  async listForAdmin(auth: AuthenticatedUser, limit = DEFAULT_LIST_LIMIT) {
    this.assertAdmin(auth);
    const rows = await this.repository.listRecent(Math.min(Math.max(limit, 1), 100));
    const readIds = new Set(
      (
        await this.repository.listReadNotificationIds(
          auth.id,
          rows.map((row) => row.id)
        )
      ).map((row) => row.notificationId)
    );

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      href: row.href,
      entityType: row.entityType,
      entityId: row.entityId,
      createdAt: row.createdAt.toISOString(),
      read: readIds.has(row.id),
    }));
  }

  async unreadCount(auth: AuthenticatedUser) {
    this.assertAdmin(auth);
    const count = await this.repository.countUnreadForUser(auth.id);
    return { count };
  }

  async markRead(auth: AuthenticatedUser, notificationId: string) {
    this.assertAdmin(auth);
    const existing = await this.repository.findById(notificationId);
    if (!existing) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Notification not found",
        statusCode: 404,
      });
    }
    await this.repository.markRead(auth.id, notificationId);
    return { ok: true as const };
  }

  async markAllRead(auth: AuthenticatedUser) {
    this.assertAdmin(auth);
    const result = await this.repository.markAllRead(auth.id);
    return { ok: true as const, count: result.count };
  }
}
