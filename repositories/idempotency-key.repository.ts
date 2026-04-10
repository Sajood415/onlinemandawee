import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

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

  markSucceeded(input: {
    key: string;
    responseCode: number;
    responseBody: Record<string, unknown>;
    resourceType?: string;
    resourceId?: string;
  }) {
    return prisma.idempotencyKey.update({
      where: { key: input.key },
      data: {
        status: "SUCCEEDED",
        responseCode: input.responseCode,
        responseBody: input.responseBody as Prisma.InputJsonValue,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
      },
    });
  }

  markFailed(input: {
    key: string;
    responseCode: number;
    responseBody: Record<string, unknown>;
  }) {
    return prisma.idempotencyKey.update({
      where: { key: input.key },
      data: {
        status: "FAILED",
        responseCode: input.responseCode,
        responseBody: input.responseBody as Prisma.InputJsonValue,
      },
    });
  }
}
