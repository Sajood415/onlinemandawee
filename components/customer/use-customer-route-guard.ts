"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  buildLoginRedirectPath,
  roleHomePath,
} from "@/lib/auth/client-auth-routing";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";

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
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace(buildLoginRedirectPath(pathname));
        return;
      }

      try {
        const response = await fetchWithAuth("/api/auth/me");
        const currentUser = await parseApiResponse<AuthUser>(response);

        if (currentUser.role !== "CUSTOMER") {
          router.replace(roleHomePath(currentUser.role));
          return;
        }

        if (mounted) {
          setUser(currentUser);
          setIsLoading(false);
        }
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        router.replace(buildLoginRedirectPath(pathname));
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  return useMemo(
    () => ({
      isLoading,
      user,
    }),
    [isLoading, user]
  );
}
