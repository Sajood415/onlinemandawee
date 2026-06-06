"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  buildLoginRedirectPath,
  roleHomePath,
} from "@/lib/auth/client-auth-routing";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { useAuth } from "@/store/auth-context";

type AuthUser = {
  id: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  status: "ACTIVE" | "PENDING" | "BLOCKED";
  fullName: string;
  email: string;
  phone: string;
};

export function useCustomerRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const routerRef = useRef(router);
  const logoutRef = useRef(logout);
  routerRef.current = router;
  logoutRef.current = logout;

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const clearSessionAndRedirect = useCallback(() => {
    logoutRef.current();
    routerRef.current.replace(buildLoginRedirectPath(pathname));
  }, [pathname]);

  const verifySession = useCallback(async (signal?: AbortSignal) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      logoutRef.current();
      routerRef.current.replace(buildLoginRedirectPath(pathname));
      return;
    }

    try {
      const response = await fetchWithAuth("/api/auth/me", { signal });

      if (signal?.aborted) return;

      if (response.status === 401 || response.status === 403) {
        clearSessionAndRedirect();
        return;
      }

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const currentUser = await parseApiResponse<AuthUser>(response);

      if (signal?.aborted) return;

      if (currentUser.role !== "CUSTOMER") {
        routerRef.current.replace(roleHomePath(currentUser.role));
        return;
      }

      setUser(currentUser);
      setIsLoading(false);
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        return;
      }
      clearSessionAndRedirect();
    }
  }, [clearSessionAndRedirect, pathname]);

  useEffect(() => {
    const controller = new AbortController();
    void verifySession(controller.signal);
    return () => controller.abort();
  }, [verifySession]);

  return useMemo(
    () => ({
      isLoading,
      user,
    }),
    [isLoading, user]
  );
}
