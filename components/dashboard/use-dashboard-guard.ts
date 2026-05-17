"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";

type DashboardRole = "ADMIN" | "VENDOR";

type AuthUser = {
  id: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  status?: "ACTIVE" | "PENDING" | "BLOCKED";
  fullName: string;
  email: string;
};

const roleDashboardPath: Record<DashboardRole, string> = {
  ADMIN: "/admin/dashboard",
  VENDOR: "/vendor/dashboard",
};

export function useDashboardGuard(expectedRole: DashboardRole) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        const json = (await res.json()) as { data: AuthUser };
        const currentUser = json.data;

        if (currentUser.role === "VENDOR" && currentUser.status !== "ACTIVE") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          router.replace("/auth/login");
          return;
        }

        if (currentUser.role !== expectedRole) {
          if (currentUser.role === "ADMIN") {
            router.replace(roleDashboardPath.ADMIN);
            return;
          }
          if (currentUser.role === "VENDOR") {
            router.replace(roleDashboardPath.VENDOR);
            return;
          }
          router.replace("/");
          return;
        }

        if (mounted) {
          setUser(currentUser);
          setIsLoading(false);
        }
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [expectedRole, pathname, router]);

  return useMemo(
    () => ({
      isLoading,
      user,
    }),
    [isLoading, user]
  );
}
