import "server-only";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { env } from "@/config/env";

declare global {
  var __prisma__: PrismaClient | undefined;
  var __prisma_schema_revision__: string | undefined;
}

/** Hash schema + generated client so dev invalidates after `prisma generate`. */
function getPrismaClientRevision() {
  try {
    const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
    const clientPath = path.join(process.cwd(), "node_modules/.prisma/client/index.d.ts");
    const schema = readFileSync(schemaPath, "utf8");
    const clientTypes = readFileSync(clientPath, "utf8");
    return createHash("sha256")
      .update(schema)
      .update(clientTypes)
      .digest("hex")
      .slice(0, 16);
  } catch {
    return "unknown";
  }
}

const createPrismaClient = () =>
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
  });

const getPrismaClient = (): PrismaClient => {
  const clientRevision = getPrismaClientRevision();
  const existing = globalThis.__prisma__;
  const revisionStale =
    env.NODE_ENV !== "production" &&
    globalThis.__prisma_schema_revision__ !== clientRevision;

  if (existing && revisionStale) {
    void existing.$disconnect().catch(() => undefined);
    globalThis.__prisma__ = undefined;
  }

  if (!globalThis.__prisma__) {
    globalThis.__prisma__ = createPrismaClient();
    globalThis.__prisma_schema_revision__ = clientRevision;
  }

  return globalThis.__prisma__;
};

export const prisma = getPrismaClient();
