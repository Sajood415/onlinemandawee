export const getClientIpAddress = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(",")[0]?.trim() ?? null;
};

export const getUserAgent = (request: Request) => {
  return request.headers.get("user-agent");
};
