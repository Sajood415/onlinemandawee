import { env } from "@/config/env";
import { prisma } from "@/lib/db/prisma";

export class HealthService {
  async getStatus() {
    await prisma.$runCommandRaw({
      ping: 1,
    });

    return {
      name: env.APP_NAME,
      environment: env.NODE_ENV,
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
