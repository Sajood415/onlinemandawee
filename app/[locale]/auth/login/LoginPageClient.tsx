"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

import {
  AuthShell,
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
} from "@/components/auth/AuthShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { PasswordInput } from "@/components/ui/PasswordInput";
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
  const t = useTranslations("Auth.login");
  const tc = useTranslations("Common");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    if (!localStorage.getItem("accessToken")) return;
    router.replace(
      resolvePostAuthRedirect({
        role: user.role,
        redirect: searchParams.get("redirect"),
      })
    );
  }, [isAuthenticated, isLoading, router, searchParams, user]);

  if (isLoading) {
    return <PageLoader message={tc("loadingLogin")} fullScreen />;
  }

  if (isAuthenticated && user && localStorage.getItem("accessToken")) {
    return <PageLoader message={tc("redirecting")} fullScreen />;
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
      const msg = err instanceof Error ? err.message : t("failed");
      setError(msg);
      toast.error(t("failed"), msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <p className="text-sm text-neutral-600">
          {t("newCustomer")}{" "}
          <Link href="/auth/signup" className="font-semibold text-[#0F3460] underline-offset-4 hover:underline">
            {t("createAccount")}
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("identifier")}
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            className={AUTH_INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            {t("password")}
          </label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={AUTH_INPUT_CLASS}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button type="submit" disabled={busy} className={AUTH_BUTTON_CLASS}>
          {busy ? t("signingIn") : t("signIn")}
        </button>
      </form>

      <Link
        href="/auth/forgot-password"
        className="mt-4 inline-block text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
      >
        {t("forgotPassword")}
      </Link>
    </AuthShell>
  );
}
