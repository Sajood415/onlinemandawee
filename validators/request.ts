import { ZodType } from "zod";

export const parseBody = async <T>(request: Request, schema: ZodType<T>) => {
  const body = await request.json();
  return schema.parse(body);
};

export const parseOptionalBody = async <T>(
  request: Request,
  schema: ZodType<T>,
  fallback: T
) => {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return schema.parse(fallback);
  }

  return schema.parse(JSON.parse(rawBody));
};

export const parseQuery = <T>(
  request: Request,
  schema: ZodType<T>
) => {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  return schema.parse(query);
};

export const parseParams = <T>(
  params: unknown,
  schema: ZodType<T>
) => {
  return schema.parse(params);
};
