export type AppRole = "CUSTOMER" | "VENDOR" | "ADMIN";

const CUSTOMER_ONLY_PREFIXES = ["/cart", "/checkout"];

export const roleHomePath = (role: AppRole) => {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/";
};

export const sanitizeRedirectPath = (redirect: string | null | undefined) => {
  if (!redirect) return null;
  if (!redirect.startsWith("/")) return null;
  if (redirect.startsWith("//")) return null;
  return redirect;
};

export const buildLoginRedirectPath = (pathname: string) =>
  `/auth/login?redirect=${encodeURIComponent(pathname)}`;

export const resolvePostAuthRedirect = (input: {
  role: AppRole;
  redirect: string | null | undefined;
}) => {
  const redirectPath = sanitizeRedirectPath(input.redirect);
  if (!redirectPath) {
    return roleHomePath(input.role);
  }

  const isCustomerOnlyDestination = CUSTOMER_ONLY_PREFIXES.some(
    (prefix) => redirectPath === prefix || redirectPath.startsWith(`${prefix}/`)
  );

  if (isCustomerOnlyDestination && input.role !== "CUSTOMER") {
    return roleHomePath(input.role);
  }

  return redirectPath;
};
