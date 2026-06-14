import type { NextRequest } from "next/server";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { SessionRepository } from "@/repositories/session.repository";
import { UserRepository } from "@/repositories/user.repository";

export async function getOptionalAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader) return null;

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  try {
    const payload = await verifyAuthToken(token, "access");
    const sessionRepository = new SessionRepository();
    const userRepository = new UserRepository();

    const [session, user] = await Promise.all([
      sessionRepository.findActiveById(payload.sid),
      userRepository.findById(payload.sub),
    ]);

    if (!session || !user || user.status === "BLOCKED" || user.role !== "CUSTOMER") {
      return null;
    }

    return {
      id: user.id,
      sessionId: session.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      status: user.status,
      preferredCurrency: user.preferredCurrency ?? null,
    };
  } catch {
    return null;
  }
}
