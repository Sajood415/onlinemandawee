import { prisma } from "@/lib/db/prisma";

export class SessionRepository {
  create(input: {
    userId: string;
    refreshHash: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
  }) {
    return prisma.session.create({
      data: {
        userId: input.userId,
        refreshHash: input.refreshHash,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
        expiresAt: input.expiresAt,
      },
    });
  }

  findActiveById(id: string) {
    return prisma.session.findFirst({
      where: {
        id,
        status: "ACTIVE",
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  updateRefreshHash(id: string, refreshHash: string, expiresAt: Date) {
    return prisma.session.update({
      where: { id },
      data: {
        refreshHash,
        expiresAt,
      },
    });
  }

  revokeById(id: string) {
    return prisma.session.update({
      where: { id },
      data: {
        status: "REVOKED",
      },
    });
  }
}
