import type { NextRequest } from "next/server";

import { toErrorResponse } from "@/lib/errors/to-error-response";

type RouteContext = {
  params?: Promise<Record<string, string | string[]>>;
};

type RouteHandler<TContext extends RouteContext = RouteContext> = (
  request: NextRequest,
  context: TContext
) => Promise<Response>;

export const withErrorHandling = <TContext extends RouteContext = RouteContext>(
  handler: RouteHandler<TContext>
) => {
  return async (request: NextRequest, context: TContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
};
