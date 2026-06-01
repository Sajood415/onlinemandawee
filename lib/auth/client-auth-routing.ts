export type AppRole = "CUSTOMER" | "VENDOR" | "ADMIN";

const CUSTOMER_ONLY_PREFIXES = ["/account"];

const ROLE_HOME_PATHS: Record<AppRole, string> = {
  ADMIN: "/admin/dashboard",
  VENDOR: "/vendor/dashboard",
  CUSTOMER: "/account",
};

const NEUTRAL_POST_AUTH_PATHS = new Set(["/", "/auth/login", "/auth/signup"]);

export const roleHomePath = (role: AppRole) => ROLE_HOME_PATHS[role];

export const sanitizeRedirectPath = (redirect: string | null | undefined) => {
  if (!redirect) return null;
  if (!redirect.startsWith("/")) return null;
  if (redirect.startsWith("//")) return null;
  return redirect;
};

export const isNeutralPostAuthPath = (path: string | null | undefined) => {
  if (!path) return true;
  if (NEUTRAL_POST_AUTH_PATHS.has(path)) return true;
  if (path.startsWith("/auth/")) return true;
  return false;
};

export const buildLoginRedirectPath = (pathname: string) => {
  if (isNeutralPostAuthPath(pathname)) {
    return "/auth/login";
  }
  return `/auth/login?redirect=${encodeURIComponent(pathname)}`;
};

export const resolvePostAuthRedirect = (input: {
  role: AppRole;
  redirect: string | null | undefined;
}) => {
  const redirectPath = sanitizeRedirectPath(input.redirect);

  if (isNeutralPostAuthPath(redirectPath)) {
    return roleHomePath(input.role);
  }

  const isCustomerOnlyDestination = CUSTOMER_ONLY_PREFIXES.some(
    (prefix) => redirectPath === prefix || redirectPath!.startsWith(`${prefix}/`)
  );

  if (isCustomerOnlyDestination && input.role !== "CUSTOMER") {
    return roleHomePath(input.role);
  }

  return redirectPath!;
};
