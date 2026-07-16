"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

import {
  AuthShell,
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_SECONDARY_BUTTON_CLASS,
} from "@/components/auth/AuthShell";
import { PasswordRequirements } from "@/components/vendor/onboarding/PasswordRequirements";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { getPasswordValidationMessage } from "@/components/vendor/onboarding/validation";
import { resolvePostAuthRedirect } from "@/lib/auth/client-auth-routing";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { toast } from "@/lib/utils/toast";
import { useAuth } from "@/store/auth-context";

type OtpSendResponse = {
  identifier: string;
  debugCode?: string;
};

type OtpVerifyResponse = {
  identifier: string;
  verificationToken: string;
};

type RegisterResponse = {
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

export function SignupPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession } = useAuth();
  const t = useTranslations("Auth.signup");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState<"details" | "otp">("details");
  const [code, setCode] = useState("");
  const [otpIdentifier, setOtpIdentifier] = useState<string | null>(null);

  const [busyAction, setBusyAction] = useState<"send" | "verify" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [searchParams]);

  const sendOtpFromCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedEmail = normalizeEmailForAuth(email);
    const passwordError = getPasswordValidationMessage(password);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setBusyAction("send");
    try {
      const availabilityRes = await fetch("/api/auth/signup/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          phone: phone.trim(),
        }),
      });
      await parseApiResponse(availabilityRes);

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: normalizedEmail,
          purpose: "CUSTOMER_SIGNUP",
        }),
      });
      const data = await parseApiResponse<OtpSendResponse>(res);
      setOtpIdentifier(data.identifier);
      setStep("otp");
      setCode("");

      if (data.debugCode) {
        setMessage(`Check your email. Dev code: ${data.debugCode}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create account";
      setError(msg);
      toast.error("Could not create account", msg);
    } finally {
      setBusyAction(null);
    }
  };

  const verifyOtpAndCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedEmail = normalizeEmailForAuth(email);

    if (!otpIdentifier) {
      setError("OTP session missing. Please start again.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter a valid 6-digit code.");
      return;
    }

    setBusyAction("verify");
    try {
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: normalizedEmail,
          purpose: "CUSTOMER_SIGNUP",
          code: code.trim(),
        }),
      });
      const verifyData = await parseApiResponse<OtpVerifyResponse>(verifyRes);

      const registerRes = await fetch("/api/auth/register/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
          password,
          verificationToken: verifyData.verificationToken,
        }),
      });
      const registerData = await parseApiResponse<RegisterResponse>(registerRes);

      establishSession(registerData);

      toast.success("Account created", "Welcome to Online Mandawee.");
      router.replace(
        resolvePostAuthRedirect({
          role: registerData.user.role,
          redirect: searchParams.get("redirect"),
        })
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create account";
      setError(msg);
      toast.error("Could not create account", msg);
    } finally {
      setBusyAction(null);
    }
  };

  const resendOtp = async () => {
    const normalizedEmail = normalizeEmailForAuth(email);
    setError(null);
    setMessage(null);
    setBusyAction("send");

    try {
      const availabilityRes = await fetch("/api/auth/signup/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          phone: phone.trim(),
        }),
      });
      await parseApiResponse(availabilityRes);

      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: normalizedEmail,
          purpose: "CUSTOMER_SIGNUP",
        }),
      });
      const data = await parseApiResponse<OtpSendResponse>(res);
      setOtpIdentifier(data.identifier);
      if (data.debugCode) {
        setMessage(`New code sent. Dev code: ${data.debugCode}`);
      } else {
        setMessage("A new code was sent to your email.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not resend code";
      setError(msg);
      toast.error("Could not resend code", msg);
    } finally {
      setBusyAction(null);
    }
  };

  const title = step === "otp" ? t("otpTitle") : t("title");
  const subtitle =
    step === "otp"
      ? t("otpSubtitle", { email: otpIdentifier ?? normalizeEmailForAuth(email) })
      : t("subtitle");

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <p className="text-sm text-neutral-600">
          {t("alreadyHave")}{" "}
          <Link href="/auth/login" className="font-semibold text-[#0F3460] underline-offset-4 hover:underline">
            {t("signIn")}
          </Link>
        </p>
      }
    >
      {step === "details" ? (
        <form className="space-y-5" onSubmit={sendOtpFromCreate}>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("fullName")}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className={AUTH_INPUT_CLASS}
            />
          </div>
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
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("phone")}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="+93701234567"
              autoComplete="tel"
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
              autoComplete="new-password"
              required
              className={AUTH_INPUT_CLASS}
              aria-describedby="signup-password-requirements"
            />
            <div id="signup-password-requirements" className="mt-2">
              <PasswordRequirements password={password} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("confirmPassword")}
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className={AUTH_INPUT_CLASS}
            />
          </div>

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button type="submit" disabled={busyAction !== null} className={AUTH_BUTTON_CLASS}>
            {busyAction === "send" ? (
              <span className="me-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : null}
            {busyAction === "send" ? t("creating") : t("create")}
          </button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form className="space-y-5" onSubmit={verifyOtpAndCreateAccount}>
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

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button type="submit" disabled={busyAction !== null} className={AUTH_BUTTON_CLASS}>
            {busyAction === "verify" ? t("verifying") : t("verify")}
          </button>

          <button
            type="button"
            onClick={() => void resendOtp()}
            disabled={busyAction !== null}
            className={AUTH_SECONDARY_BUTTON_CLASS}
          >
            {t("resendCode")}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("details");
              setCode("");
              setOtpIdentifier(null);
              setMessage(null);
              setError(null);
            }}
            className="inline-flex w-full items-center justify-center text-sm font-semibold text-[#0F3460] underline-offset-4 hover:underline"
          >
            {t("editDetails")}
          </button>
        </form>
      ) : null}
    </AuthShell>
  );
}
