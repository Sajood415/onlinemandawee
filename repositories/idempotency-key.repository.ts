import { prisma } from "@/lib/db/prisma";

export class IdempotencyKeyRepository {
  findByKey(key: string) {
    return prisma.idempotencyKey.findUnique({
      where: { key },
    });
  }

  createInProgress(input: {
    key: string;
    scope: string;
    requestHash: string;
    expiresAt: Date;
  }) {
    return prisma.idempotencyKey.create({
      data: {
        key: input.key,
        scope: input.scope,
        requestHash: input.requestHash,
        expiresAt: input.expiresAt,
        status: "IN_PROGRESS",
      },
    });
  }
}
