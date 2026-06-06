"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { PasswordRequirements } from "@/components/vendor/onboarding/PasswordRequirements";
import { usePasswordRules } from "@/lib/i18n/use-password-rules";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth.forgotPassword");
  const tp = useTranslations("Auth.passwordRequirements");
  const { getValidationMessage } = usePasswordRules();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phase, setPhase] = useState<"request" | "verify" | "reset">("request");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestReset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await parseApiResponse<{ debugCode?: string }>(res);
      setPhase("verify");
      setMessage(
        data.debugCode
          ? t("codeSentDev", { code: data.debugCode })
          : t("codeSent")
      );
      toast.success(t("sendCode"), t("codeSent"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("requestFailed");
      setError(msg);
      toast.error(t("requestFailed"), msg);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await parseApiResponse<{ resetToken: string }>(res);
      setResetToken(data.resetToken);
      setPhase("reset");
      setMessage(t("codeVerified"));
      toast.success(t("verifyCode"), t("codeVerified"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("verifyFailed");
      setError(msg);
      toast.error(t("verifyFailed"), msg);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    const passwordError = getValidationMessage(newPassword);
    if (passwordError) {
      setError(passwordError);
      toast.error(tp("title"), passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!resetToken) {
      setError("Reset token missing");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          resetToken,
          newPassword,
        }),
      });
      await parseApiResponse<{ success: true }>(res);
      setMessage("Password reset complete. You can now log in.");
      setPhase("request");
      setCode("");
      setResetToken(null);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password reset", "You can now log in.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Reset failed";
      setError(msg);
      toast.error("Reset failed", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-neutral-50 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
        <p className="mt-2 text-sm text-neutral-600">{t("subtitle")}</p>

        {phase === "request" ? (
          <form className="mt-6 space-y-4" onSubmit={requestReset}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                {t("email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? t("sending") : t("sendCode")}
            </button>
          </form>
        ) : null}

        {phase === "verify" ? (
          <form className="mt-6 space-y-4" onSubmit={verifyCode}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                {t("verificationCode")}
              </label>
              <input
                type="text"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? t("verifying") : t("verifyCode")}
            </button>
          </form>
        ) : null}

        {phase === "reset" ? (
          <form className="mt-6 space-y-4" onSubmit={submitReset}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                {t("newPassword")}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-describedby="forgot-password-requirements"
              />
              <div id="forgot-password-requirements" className="mt-2">
                <PasswordRequirements password={newPassword} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-neutral-700">
                {t("confirmPassword")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-invalid={
                  confirmPassword.length > 0 && newPassword !== confirmPassword
                }
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {t("passwordMismatch")}
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? t("saving") : t("resetPassword")}
            </button>
          </form>
        ) : null}

        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        <Link
          href="/auth/login"
          className="mt-5 inline-block text-sm font-semibold text-[#0f3460] hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}
