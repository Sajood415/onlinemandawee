import "server-only";

import { PrismaClient } from "@prisma/client";

import { env } from "@/config/env";

declare global {
  var __prisma__: PrismaClient | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
  });

/** True when the cached client was created before a schema change (e.g. new models). */
const isPrismaClientStale = (client: PrismaClient) =>
  typeof (client as PrismaClient & { productVariant?: unknown }).productVariant ===
  "undefined";

const getPrismaClient = (): PrismaClient => {
  const existing = globalThis.__prisma__;

  if (existing && env.NODE_ENV !== "production" && isPrismaClientStale(existing)) {
    void existing.$disconnect().catch(() => undefined);
    globalThis.__prisma__ = undefined;
  }

  if (!globalThis.__prisma__) {
    globalThis.__prisma__ = createPrismaClient();
  }

  return globalThis.__prisma__;
};

export const prisma = getPrismaClient();
