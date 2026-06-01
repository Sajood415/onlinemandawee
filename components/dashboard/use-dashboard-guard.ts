"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { buildLoginRedirectPath, roleHomePath } from "@/lib/auth/client-auth-routing";

type DashboardRole = "ADMIN" | "VENDOR";

type AuthUser = {
  id: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  status?: "ACTIVE" | "PENDING" | "BLOCKED";
  fullName: string;
  email: string;
};

export function useDashboardGuard(expectedRole: DashboardRole) {
  const router = useRouter();
  const pathname = usePathname();
  const routerRef = useRef(router);
  routerRef.current = router;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifySession = useCallback(async (signal?: AbortSignal) => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      routerRef.current.replace(buildLoginRedirectPath(pathname));
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (signal?.aborted) {
        return;
      }

      if (!res.ok) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        routerRef.current.replace(buildLoginRedirectPath(pathname));
        return;
      }

      const json = (await res.json()) as { data: AuthUser };
      const currentUser = json.data;

      if (signal?.aborted) {
        return;
      }

      if (currentUser.role === "VENDOR" && currentUser.status !== "ACTIVE") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        routerRef.current.replace("/auth/login");
        return;
      }

      if (currentUser.role !== expectedRole) {
        if (currentUser.role === "ADMIN") {
          routerRef.current.replace(roleHomePath("ADMIN"));
          return;
        }
        if (currentUser.role === "VENDOR") {
          routerRef.current.replace(roleHomePath("VENDOR"));
          return;
        }
        routerRef.current.replace("/");
        return;
      }

      setUser(currentUser);
      setIsLoading(false);
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        return;
      }
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      routerRef.current.replace(buildLoginRedirectPath(pathname));
    }
  }, [expectedRole, pathname]);

  useEffect(() => {
    const controller = new AbortController();

    void verifySession(controller.signal);

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsLoading(true);
        void verifySession();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      controller.abort();
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [verifySession]);

  return useMemo(
    () => ({
      isLoading,
      user,
    }),
    [isLoading, user]
  );
}
