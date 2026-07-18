"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Loader2, Mail, UserCircle2 } from "lucide-react";

import { PasswordRequirements } from "@/components/vendor/onboarding/PasswordRequirements";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { usePasswordRules } from "@/lib/i18n/use-password-rules";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const SECTION = "rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8";
const SECTION_TITLE = "text-base font-semibold text-neutral-900";
const SECTION_LEAD = "mt-1 text-sm leading-relaxed text-neutral-500";

type CustomerProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
};

type CustomerProfileSectionProps = {
  onProfileUpdated?: (profile: Pick<CustomerProfile, "fullName" | "email" | "phone">) => void;
  variant?: "card" | "settings";
};

export function CustomerProfileSection({
  onProfileUpdated,
  variant = "card",
}: CustomerProfileSectionProps) {
  const t = useTranslations("CustomerProfile");
  const tCommon = useTranslations("Common");
  const { getValidationMessage } = usePasswordRules();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [resetPhase, setResetPhase] = useState<"idle" | "code" | "new">("idle");
  const [resetCode, setResetCode] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setProfileError(null);
    try {
      const res = await fetchWithAuth("/api/customer/profile");
      const data = await parseApiResponse<CustomerProfile>(res);
      setProfile(data);
      setFullName(data.fullName);
      setPhone(data.phone);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : t("errors.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);

    try {
      const res = await fetchWithAuth("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await parseApiResponse<CustomerProfile>(res);
      setProfile(data);
      onProfileUpdated?.(data);
      toast.success(t("toasts.profileUpdated"), t("toasts.profileUpdatedDesc"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("errors.loadFailed");
      setProfileError(msg);
      toast.error(t("toasts.profileFailed"), msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);

    if (!currentPassword.trim()) {
      setPasswordError(t("validation.currentPasswordRequired"));
      return;
    }

    const passwordErrorMsg = getValidationMessage(newPassword);
    if (passwordErrorMsg) {
      setPasswordError(passwordErrorMsg);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("validation.passwordMismatch"));
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetchWithAuth("/api/customer/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      await parseApiResponse<{ success: boolean }>(res);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("toasts.passwordUpdated"), t("toasts.passwordUpdatedDesc"));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("toasts.passwordFailed");
      setPasswordError(msg);
      toast.error(t("toasts.passwordFailed"), msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const sendResetEmail = async () => {
    setResetBusy(true);
    setResetError(null);
    setResetMessage(null);
    try {
      const res = await fetchWithAuth("/api/customer/profile/password/reset", {
        method: "POST",
      });
      const data = await parseApiResponse<{ debugCode?: string }>(res);
      setResetPhase("code");
      setResetCode("");
      setResetMessage(
        data.debugCode
          ? t("reset.codeSentDev", { code: data.debugCode })
          : t("reset.codeSent", { email: profile?.email ?? "" })
      );
      toast.success(t("toasts.codeSent"), t("toasts.codeSentDesc"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("toasts.codeFailed");
      setResetError(msg);
      toast.error(t("toasts.codeFailed"), msg);
    } finally {
      setResetBusy(false);
    }
  };

  const verifyResetCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(resetCode.trim())) {
      setResetError(t("validation.invalidCode"));
      return;
    }

    setResetBusy(true);
    setResetError(null);
    setResetMessage(null);
    try {
      const res = await fetchWithAuth("/api/customer/profile/password/reset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: resetCode.trim() }),
      });
      const data = await parseApiResponse<{ resetToken: string }>(res);
      setResetToken(data.resetToken);
      setResetPhase("new");
      setResetMessage(t("reset.codeVerified"));
      toast.success(t("toasts.verified"), t("toasts.verifiedDesc"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("toasts.verifyFailed");
      setResetError(msg);
      toast.error(t("toasts.verifyFailed"), msg);
    } finally {
      setResetBusy(false);
    }
  };

  const confirmResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    const passwordErrorMsg = getValidationMessage(resetNewPassword);
    if (passwordErrorMsg) {
      setResetError(passwordErrorMsg);
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError(t("validation.resetMismatch"));
      return;
    }
    if (!resetToken) {
      setResetError(t("validation.resetExpired"));
      return;
    }

    setResetBusy(true);
    setResetError(null);
    try {
      const res = await fetchWithAuth("/api/customer/profile/password/reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword: resetNewPassword,
        }),
      });
      await parseApiResponse<{ success: boolean }>(res);
      setResetPhase("idle");
      setResetCode("");
      setResetToken(null);
      setResetNewPassword("");
      setResetConfirmPassword("");
      setResetMessage(t("reset.passwordUpdated"));
      toast.success(t("toasts.resetSuccess"), t("toasts.resetSuccessDesc"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("toasts.resetFailed");
      setResetError(msg);
      toast.error(t("toasts.resetFailed"), msg);
    } finally {
      setResetBusy(false);
    }
  };

  if (loading) {
    if (variant === "settings") {
      return (
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl border border-neutral-200 bg-white"
            />
          ))}
        </div>
      );
    }

    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      </section>
    );
  }

  const profileForm = (
    <form onSubmit={(e) => void handleProfileSubmit(e)} className="space-y-4">
      {variant === "card" ? (
        <h3 className="text-sm font-semibold text-neutral-900">{t("sections.accountDetails")}</h3>
      ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-neutral-700 sm:col-span-2">
                {t("fields.fullName")}
                <input
                  className={INPUT_CLASS}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm text-neutral-700">
                {t("fields.email")}
                <input
                  className={`${INPUT_CLASS} bg-neutral-50 text-neutral-500`}
                  value={profile?.email ?? ""}
                  readOnly
                  disabled
                />
              </label>
              <label className="block text-sm text-neutral-700">
                {t("fields.phone")}
                <input
                  className={INPUT_CLASS}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+93701234567"
                />
              </label>
            </div>
            <p className="text-xs text-neutral-500">{t("fields.emailReadonlyHint")}</p>
            {profileError ? <p className="text-sm text-red-600">{profileError}</p> : null}
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("actions.savingProfile")}
                </>
              ) : (
                t("actions.saveProfile")
              )}
            </button>
    </form>
  );

  const passwordForm = (
    <form
      onSubmit={(e) => void handlePasswordSubmit(e)}
      className={`space-y-4 ${variant === "card" ? "border-t border-neutral-200 pt-8" : ""}`}
    >
      {variant === "card" ? (
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900">{t("sections.changePassword")}</h3>
        </div>
      ) : null}
      {variant === "card" ? (
        <p className="text-sm text-neutral-600">{t("sections.changePasswordLead")}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-neutral-700 sm:col-span-2">
                {t("fields.currentPassword")}
                <PasswordInput
                  className={INPUT_CLASS}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label className="block text-sm text-neutral-700">
                {t("fields.newPassword")}
                <PasswordInput
                  className={INPUT_CLASS}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="block text-sm text-neutral-700">
                {t("fields.confirmPassword")}
                <PasswordInput
                  className={INPUT_CLASS}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>
            <PasswordRequirements password={newPassword} />
            {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("actions.updatingPassword")}
                </>
              ) : (
                t("actions.updatePassword")
              )}
            </button>
    </form>
  );

  const resetSection = (
    <div className={`space-y-4 ${variant === "card" ? "border-t border-neutral-200 pt-8" : ""}`}>
      {variant === "card" ? (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900">{t("sections.resetViaEmail")}</h3>
        </div>
      ) : null}
            <p className="text-sm text-neutral-600">
              {t("reset.forgotPrompt", { email: profile?.email ?? "" })}
            </p>

            {resetPhase === "idle" ? (
              <button
                type="button"
                onClick={() => void sendResetEmail()}
                disabled={resetBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
              >
                {resetBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("actions.sending")}
                  </>
                ) : (
                  t("actions.sendResetCode")
                )}
              </button>
            ) : null}

            {resetPhase === "code" ? (
              <form onSubmit={(e) => void verifyResetCode(e)} className="max-w-md space-y-3">
                <label className="block text-sm text-neutral-700">
                  {t("fields.verificationCode")}
                  <input
                    className={INPUT_CLASS}
                    value={resetCode}
                    maxLength={6}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={resetBusy}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {resetBusy ? t("actions.verifying") : t("actions.verifyCode")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendResetEmail()}
                    disabled={resetBusy}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
                  >
                    {t("actions.resendCode")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetPhase("idle");
                      setResetCode("");
                      setResetError(null);
                      setResetMessage(null);
                    }}
                    className="text-sm font-medium text-neutral-600 hover:underline"
                  >
                    {tCommon("cancel")}
                  </button>
                </div>
              </form>
            ) : null}

            {resetPhase === "new" ? (
              <form onSubmit={(e) => void confirmResetPassword(e)} className="max-w-lg space-y-3">
                <label className="block text-sm text-neutral-700">
                  {t("fields.newPassword")}
                  <PasswordInput
                    className={INPUT_CLASS}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="block text-sm text-neutral-700">
                  {t("fields.confirmPassword")}
                  <PasswordInput
                    className={INPUT_CLASS}
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <PasswordRequirements password={resetNewPassword} />
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {resetBusy ? t("actions.savingPassword") : t("actions.setNewPassword")}
                </button>
              </form>
            ) : null}

            {resetMessage ? (
              <p className="text-sm text-emerald-700">{resetMessage}</p>
            ) : null}
            {resetError ? <p className="text-sm text-red-600">{resetError}</p> : null}
    </div>
  );

  if (profileError && !profile) {
    return <p className="text-sm text-red-600">{profileError}</p>;
  }

  if (variant === "settings") {
    return (
      <div className="flex flex-col gap-6">
        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>{t("sections.profile")}</h2>
          <p className={SECTION_LEAD}>{t("sections.profileLead")}</p>
          <div className="mt-6">{profileForm}</div>
        </section>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>{t("sections.changePassword")}</h2>
          <p className={SECTION_LEAD}>{t("sections.changePasswordLead")}</p>
          <div className="mt-6">{passwordForm}</div>
        </section>

        <section className={SECTION}>
          <h2 className={SECTION_TITLE}>{t("sections.resetViaEmail")}</h2>
          <p className={SECTION_LEAD}>{t("sections.resetViaEmailLead")}</p>
          <div className="mt-6">{resetSection}</div>
        </section>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="inline-flex rounded-full bg-primary/10 p-2 text-primary">
          <UserCircle2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">{t("sections.profileSecurity")}</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {t("sections.profileSecurityLead")}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {profileForm}
        {passwordForm}
        {resetSection}
      </div>
    </section>
  );
}
