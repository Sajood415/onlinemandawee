import type { NextRequest } from "next/server";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { SessionRepository } from "@/repositories/session.repository";
import { UserRepository } from "@/repositories/user.repository";

type RouteContext = {
  params?: Promise<Record<string, string | string[]>>;
};

type AuthenticatedRouteContext = RouteContext & {
  auth: AuthenticatedUser;
};

type AuthenticatedRouteHandler<
  TContext extends AuthenticatedRouteContext = AuthenticatedRouteContext,
> = (request: NextRequest, context: TContext) => Promise<Response>;

const extractBearerToken = (authorizationHeader: string | null) => {
  if (!authorizationHeader) {
    throw new AppError({
      code: ERROR_CODE.UNAUTHORIZED,
      message: "Missing authorization header",
      statusCode: 401,
    });
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError({
      code: ERROR_CODE.UNAUTHORIZED,
      message: "Invalid authorization header",
      statusCode: 401,
    });
  }

  return token;
};

export const withAuth = <
  TContext extends RouteContext = RouteContext,
>(
  handler: AuthenticatedRouteHandler<TContext & { auth: AuthenticatedUser }>
) => {
  return async (request: NextRequest, context: TContext) => {
    const token = extractBearerToken(request.headers.get("authorization"));
    const payload = await verifyAuthToken(token, "access");

    const sessionRepository = new SessionRepository();
    const userRepository = new UserRepository();

    const [session, user] = await Promise.all([
      sessionRepository.findActiveById(payload.sid),
      userRepository.findById(payload.sub),
    ]);

    if (!session || !user) {
      throw new AppError({
        code: ERROR_CODE.UNAUTHORIZED,
        message: "Invalid session",
        statusCode: 401,
      });
    }

    return handler(request, {
      ...context,
      auth: {
        id: user.id,
        sessionId: session.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        status: user.status,
      },
    });
  };
};
