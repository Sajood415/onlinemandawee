import { isVendorPublicRoute } from "@/lib/routing/vendor-public-routes";

export type AppRole = "CUSTOMER" | "VENDOR" | "ADMIN";

const ROLE_HOME_PATHS: Record<AppRole, string> = {
  ADMIN: "/admin/dashboard",
  VENDOR: "/vendor/dashboard",
  CUSTOMER: "/account",
};

const NEUTRAL_POST_AUTH_PATHS = new Set(["/", "/auth/login", "/auth/signup"]);

/** Storefront paths a customer may return to after login (e.g. checkout). */
const CUSTOMER_POST_AUTH_STOREFRONT_PREFIXES = ["/checkout"] as const;

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

function pathMatchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isRolePortalPath(role: AppRole, path: string) {
  if (role === "ADMIN") {
    return pathMatchesPrefix(path, "/admin");
  }

  if (role === "VENDOR") {
    if (isVendorPublicRoute(path)) return false;
    return pathMatchesPrefix(path, "/vendor");
  }

  return pathMatchesPrefix(path, "/account");
}

function isAllowedPostAuthRedirect(role: AppRole, path: string) {
  if (isRolePortalPath(role, path)) {
    return true;
  }

  if (role === "CUSTOMER") {
    return CUSTOMER_POST_AUTH_STOREFRONT_PREFIXES.some((prefix) =>
      pathMatchesPrefix(path, prefix)
    );
  }

  return false;
}

export const buildLoginRedirectPath = (pathname: string) => {
  if (isNeutralPostAuthPath(pathname)) {
    return "/auth/login";
  }

  if (isPortalPathname(pathname) || pathMatchesPrefix(pathname, "/checkout")) {
    return `/auth/login?redirect=${encodeURIComponent(pathname)}`;
  }

  return "/auth/login";
};

export const resolvePostAuthRedirect = (input: {
  role: AppRole;
  redirect: string | null | undefined;
}) => {
  const redirectPath = sanitizeRedirectPath(input.redirect);

  if (!redirectPath || isNeutralPostAuthPath(redirectPath)) {
    return roleHomePath(input.role);
  }

  if (isAllowedPostAuthRedirect(input.role, redirectPath)) {
    return redirectPath;
  }

  return roleHomePath(input.role);
};

export function isPortalPathname(pathname: string) {
  if (pathMatchesPrefix(pathname, "/account")) return true;
  if (pathMatchesPrefix(pathname, "/admin")) return true;
  if (pathMatchesPrefix(pathname, "/vendor") && !isVendorPublicRoute(pathname)) {
    return true;
  }
  return false;
}

/** Login / signup / forgot-password — hide storefront header + footer. */
export function isAuthPathname(pathname: string) {
  return pathMatchesPrefix(pathname, "/auth");
}
