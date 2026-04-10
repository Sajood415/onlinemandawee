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

export const prisma = globalThis.__prisma__ ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalThis.__prisma__ = prisma;
}
