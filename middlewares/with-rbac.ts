import type { NextRequest } from "next/server";

import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { Role } from "@/domain/auth/role";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { withAuth } from "@/middlewares/with-auth";

type RouteContext = {
  params?: Promise<Record<string, string | string[]>>;
};

type AuthorizedRouteContext = RouteContext & {
  auth: AuthenticatedUser;
};

type AuthorizedRouteHandler<
  TContext extends AuthorizedRouteContext = AuthorizedRouteContext,
> = (request: NextRequest, context: TContext) => Promise<Response>;

export const withRbac = <
  TContext extends RouteContext = RouteContext,
>(
  allowedRoles: Role[],
  handler: AuthorizedRouteHandler<TContext & { auth: AuthenticatedUser }>
) => {
  return withAuth(async (request, context) => {
    if (!allowedRoles.includes(context.auth.role)) {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Insufficient permissions",
        statusCode: 403,
      });
    }

    return handler(request, context as TContext & { auth: AuthenticatedUser });
  });
};
