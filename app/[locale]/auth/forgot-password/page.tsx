"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import {
  AuthShell,
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
} from "@/components/auth/AuthShell";
import { PasswordRequirements } from "@/components/vendor/onboarding/PasswordRequirements";
import { PasswordInput } from "@/components/ui/PasswordInput";
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
        data.debugCode ? t("codeSentDev", { code: data.debugCode }) : t("codeSent")
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
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <Link
          href="/auth/login"
          className="text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      }
    >
      {phase === "request" ? (
        <form className="space-y-5" onSubmit={requestReset}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={AUTH_INPUT_CLASS}
            />
          </div>
          <button type="submit" disabled={busy} className={AUTH_BUTTON_CLASS}>
            {busy ? t("sending") : t("sendCode")}
          </button>
        </form>
      ) : null}

      {phase === "verify" ? (
        <form className="space-y-5" onSubmit={verifyCode}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("verificationCode")}
            </label>
            <input
              type="text"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              inputMode="numeric"
              className={AUTH_INPUT_CLASS}
            />
          </div>
          <button type="submit" disabled={busy} className={AUTH_BUTTON_CLASS}>
            {busy ? t("verifying") : t("verifyCode")}
          </button>
        </form>
      ) : null}

      {phase === "reset" ? (
        <form className="space-y-5" onSubmit={submitReset}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("newPassword")}
            </label>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={AUTH_INPUT_CLASS}
              aria-describedby="forgot-password-requirements"
            />
            <div id="forgot-password-requirements" className="mt-2">
              <PasswordRequirements password={newPassword} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("confirmPassword")}
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={AUTH_INPUT_CLASS}
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
          <button type="submit" disabled={busy} className={AUTH_BUTTON_CLASS}>
            {busy ? t("saving") : t("resetPassword")}
          </button>
        </form>
      ) : null}

      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </AuthShell>
  );
}
