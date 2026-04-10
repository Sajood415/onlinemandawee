import { ZodType } from "zod";

export const parseBody = async <T>(request: Request, schema: ZodType<T>) => {
  const body = await request.json();
  return schema.parse(body);
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
