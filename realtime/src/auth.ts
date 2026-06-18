import { jwtVerify } from "jose";

import { config } from "./config.js";
import { prisma } from "./prisma.js";

export type SocketAuthUser = {
  id: string;
  sessionId: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  email: string;
  fullName: string;
  status: "ACTIVE" | "PENDING" | "BLOCKED";
};

export async function authenticateSocketToken(
  token: string | undefined
): Promise<SocketAuthUser | null> {
  if (!token) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(config.jwtAccessSecret);
    const { payload } = await jwtVerify(token, secret);

    if (payload.type !== "access" || typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      return null;
    }

    const role = payload.role;
    if (role !== "CUSTOMER" && role !== "VENDOR" && role !== "ADMIN") {
      return null;
    }

    const [session, user] = await Promise.all([
      prisma.session.findFirst({
        where: {
          id: payload.sid,
          userId: payload.sub,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.user.findUnique({ where: { id: payload.sub } }),
    ]);

    if (!session || !user || user.status === "BLOCKED") {
      return null;
    }

    if (user.role === "VENDOR" && user.status !== "ACTIVE") {
      return null;
    }

    return {
      id: user.id,
      sessionId: session.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
    };
  } catch {
    return null;
  }
}
