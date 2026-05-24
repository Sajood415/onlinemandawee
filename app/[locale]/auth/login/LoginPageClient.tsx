"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";

import { PageLoader } from "@/components/ui/PageLoader";
import { resolvePostAuthRedirect } from "@/lib/auth/client-auth-routing";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
import { useAuth } from "@/store/auth-context";

type LoginResponse = {
  user: {
    id: string;
    sessionId: string;
    role: "CUSTOMER" | "VENDOR" | "ADMIN";
    email: string;
    phone: string;
    fullName: string;
    status: "ACTIVE" | "PENDING" | "BLOCKED";
  };
  tokens: { accessToken: string; refreshToken: string; tokenType: "Bearer" };
};

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession, isAuthenticated, isLoading, user } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    router.replace(
      resolvePostAuthRedirect({
        role: user.role,
        redirect: searchParams.get("redirect"),
      })
    );
  }, [isAuthenticated, isLoading, router, searchParams, user]);

  if (isLoading) {
    return <PageLoader message="Loading login..." fullScreen />;
  }

  if (isAuthenticated && user) {
    return <PageLoader message="Redirecting..." fullScreen />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await parseApiResponse<LoginResponse>(res);
      establishSession(data);

      router.replace(
        resolvePostAuthRedirect({
          role: data.user.role,
          redirect: searchParams.get("redirect"),
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
      toast.error("Login failed", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-neutral-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-[#0f3460]">Login</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Sign in to access your dashboard.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700">
              Email or phone
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-neutral-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <Link
          href="/auth/forgot-password"
          className="mt-4 inline-block text-sm font-semibold text-[#0f3460] hover:underline"
        >
          Forgot password?
        </Link>
        <p className="mt-3 text-sm text-neutral-600">
          New customer?{" "}
          <Link
            href="/auth/signup"
            className="font-semibold text-[#0f3460] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
