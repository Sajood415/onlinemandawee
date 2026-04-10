import { prisma } from "@/lib/db/prisma";

export class SessionRepository {
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
}
