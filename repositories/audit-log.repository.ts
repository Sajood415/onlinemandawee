import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type CreateAuditLogInput = {
  actorUserId?: string;
  actorRole?: "CUSTOMER" | "VENDOR" | "ADMIN";
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export class AuditLogRepository {
  create(data: CreateAuditLogInput) {
    return prisma.auditLog.create({
      data: {
        actorRole: data.actorRole,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        ...(data.actorUserId
          ? {
              actorUser: {
                connect: {
                  id: data.actorUserId,
                },
              },
            }
          : {}),
      },
    });
  }
}
