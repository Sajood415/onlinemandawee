import { prisma } from "@/lib/db/prisma";

export class AdminNotificationRepository {
  create(input: {
    type: string;
    title: string;
    body: string;
    href: string;
    entityType?: string | null;
    entityId?: string | null;
  }) {
    return prisma.adminNotification.create({
      data: {
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });
  }

  listRecent(limit: number) {
    return prisma.adminNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  findById(id: string) {
    return prisma.adminNotification.findUnique({ where: { id } });
  }

  listReadNotificationIds(userId: string, notificationIds: string[]) {
    if (notificationIds.length === 0) return Promise.resolve([]);
    return prisma.adminNotificationRead.findMany({
      where: {
        userId,
        notificationId: { in: notificationIds },
      },
      select: { notificationId: true },
    });
  }

  countUnreadForUser(userId: string) {
    return prisma.adminNotification.count({
      where: {
        reads: {
          none: { userId },
        },
      },
    });
  }

  markRead(userId: string, notificationId: string) {
    return prisma.adminNotificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      create: {
        notificationId,
        userId,
      },
      update: {
        readAt: new Date(),
      },
    });
  }

  async markAllRead(userId: string) {
    const unread = await prisma.adminNotification.findMany({
      where: {
        reads: {
          none: { userId },
        },
      },
      select: { id: true },
    });

    if (unread.length === 0) {
      return { count: 0 };
    }

    await prisma.adminNotificationRead.createMany({
      data: unread.map((row) => ({
        notificationId: row.id,
        userId,
      })),
    });

    return { count: unread.length };
  }
}
