"use client";

import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";

import {
  businessTypes,
  industryTypes,
  industryTypeLabels,
  kycDocumentTypes,
} from "@/domain/vendor/vendor-types";
import type { BusinessType, IndustryType, KycDocumentType } from "@/domain/vendor/vendor-types";
import type { VendorUploadKind } from "@/domain/vendor/vendor-upload-kind";
import { AddressAutocompleteInput } from "@/components/address/AddressAutocompleteInput";
import { FileAttachmentField } from "@/components/vendor/onboarding/FileAttachmentField";
import type { OnboardingStatusPayload } from "@/components/vendor/onboarding/types";
import { PasswordRequirements } from "@/components/vendor/onboarding/PasswordRequirements";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PhoneNumberField } from "@/components/vendor/onboarding/PhoneNumberField";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  sanitizeCityCountryInput,
  sanitizePostalCodeInput,
} from "@/lib/checkout/checkout-field-validation";
import {
  getCitiesForCountryName,
  getPostalCodesForCity,
  normalizeCityNameForCountry,
  normalizeCountryName,
  normalizePostalCodeForCity,
  SHIPPING_COUNTRIES,
} from "@/lib/geo/shipping-locations";
import {
  EMAIL_REGEX,
  getPasswordValidationMessage,
  getPhoneValidationMessage,
  isValidPhone,
} from "@/components/vendor/onboarding/validation";
import { formatMoneyMinor } from "@/lib/membership/subscription-policy";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { vendorOnboardingResumeStep } from "@/lib/vendor/vendor-onboarding-wizard-step";
import { slugify } from "@/lib/utils/slug";
import { toast } from "@/lib/utils/toast";

/** Matches vendor store step schema (`validators/vendor.validator.ts`) */
const STORE_DESCRIPTION_MAX_CHARS = 500;

const FIELD = "flex flex-col gap-2.5 sm:gap-3";

const CONTROL =
  "w-full min-h-11 rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm leading-snug text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20";

const LABEL = "text-[11px] font-semibold uppercase tracking-wider text-neutral-600";

const HINT = "text-xs leading-relaxed text-neutral-500";

function RequiredMark() {
  return (
    <>
      {" "}
      <abbr className="font-semibold text-red-600 no-underline" title="Required" aria-label="required">
        *
      </abbr>
    </>
  );
}

const STEP_STACK = "flex flex-col gap-8 sm:gap-10";

const SECTION =
  "rounded-xl border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8 lg:p-9";

const SECTION_HEADING = "text-base font-semibold text-neutral-900";

const SECTION_LEAD = "mt-2 max-w-xl text-sm leading-relaxed text-neutral-600";

const CALLOUT = "rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950";

const CHECK_ROW =
  "flex items-start gap-4 rounded-xl border border-neutral-200 bg-neutral-50/40 px-4 py-4 text-sm leading-relaxed text-neutral-800 sm:px-5 sm:py-4";

const VENDOR_HERO =
  "relative overflow-hidden bg-[#0a2847] text-white shadow-[0_8px_30px_rgba(5,20,40,0.35)]";
const stepsMeta = [
  "Account",
  "Store",
  "Identity",
  "Address",
  "Payout",
  "Agreements",
] as const;

export function VendorOnboardingWizard({ showTopHero = true }: { showTopHero?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("VendorPages.register.agreements");
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [uploadKey, setUploadKey] = useState<VendorUploadKind | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [otpUiPhase, setOtpUiPhase] = useState<"email" | "code">("email");
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  /** Set when the API returns debugCode (SMTP not configured in development). */
  const [devVerificationCode, setDevVerificationCode] = useState<string | null>(
    null
  );

  const [storeName, setStoreName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("INDIVIDUAL");
  const [industryType, setIndustryType] = useState<IndustryType | "">("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const slugPreview = useMemo(() => slugify(storeName || "your-store"), [storeName]);

  const descriptionTrimLen = description.trim().length;
  const descriptionOverLimit =
    descriptionTrimLen > STORE_DESCRIPTION_MAX_CHARS;

  const [documentType, setDocumentType] = useState<KycDocumentType>("PASSPORT");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieWithIdUrl, setSelfieWithIdUrl] = useState("");
  const [selfieWithIdFile, setSelfieWithIdFile] = useState<File | null>(null);

  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [proofOfAddressUrl, setProofOfAddressUrl] = useState("");
  const [proofOfAddressFile, setProofOfAddressFile] = useState<File | null>(null);

  const countryOptions = useMemo(
    () =>
      SHIPPING_COUNTRIES.map((entry) => ({
        value: entry.name,
        label: `${entry.flag} ${entry.name}`,
      })),
    []
  );

  const shippingCountryIsoCodes = useMemo(
    () => SHIPPING_COUNTRIES.map((entry) => entry.iso),
    []
  );

  const cityOptions = useMemo(
    () =>
      getCitiesForCountryName(country).map((entry) => ({
        value: entry.name,
        label: entry.name,
      })),
    [country]
  );

  const postalOptions = useMemo(
    () =>
      getPostalCodesForCity(country, city).map((code) => ({
        value: code,
        label: code,
      })),
    [country, city]
  );

  const [accountName, setAccountName] = useState("");
  const [accountNumberOrIban, setAccountNumberOrIban] = useState("");
  const [bankName, setBankName] = useState("");

  const [ag1, setAg1] = useState(false);
  const [ag2, setAg2] = useState(false);
  const [ag3, setAg3] = useState(false);
  const [ag4, setAg4] = useState(false);
  const [ag5, setAg5] = useState(false);
  const [transactionFeeAmountMinor, setTransactionFeeAmountMinor] = useState(399);
  const [membershipFeeAmount, setMembershipFeeAmount] = useState(499);
  const [membershipCurrency, setMembershipCurrency] = useState("USD");
  const [membershipTrialDays, setMembershipTrialDays] = useState(180);

  const membershipFeeLabel = useMemo(
    () => formatMoneyMinor(membershipFeeAmount, membershipCurrency, locale),
    [locale, membershipCurrency, membershipFeeAmount]
  );

  const transactionFeeLabel = useMemo(
    () => formatMoneyMinor(transactionFeeAmountMinor, "USD", locale),
    [locale, transactionFeeAmountMinor]
  );

  const authHeaders = useCallback((): Record<string, string> => {
    if (!accessToken) return {};
    return { Authorization: `Bearer ${accessToken}` };
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/platform/settings");
        if (!res.ok) return;
        const data = await parseApiResponse<{
          transactionFeeAmountMinor: number;
          membershipFeeAmount: number;
          membershipCurrency: string;
          membershipTrialDays: number;
        }>(res);
        if (!cancelled) {
          setTransactionFeeAmountMinor(data.transactionFeeAmountMinor);
          setMembershipFeeAmount(data.membershipFeeAmount);
          setMembershipCurrency(data.membershipCurrency);
          setMembershipTrialDays(data.membershipTrialDays);
        }
      } catch {
        // Keep default label
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          if (!cancelled) setReady(true);
          return;
        }
        const res = await fetch("/api/vendor/onboarding/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setReady(true);
          return;
        }
        const data = await parseApiResponse<OnboardingStatusPayload>(res);
        if (cancelled) return;

        const { draft } = data;
        setFullName(data.user.fullName);
        setEmail(data.user.email);
        setPhone(data.user.phone ?? "");
        setVerificationToken("resumed");

        setStoreName(draft.storeName);
        if (draft.businessType && businessTypes.includes(draft.businessType)) {
          setBusinessType(draft.businessType);
        }
        if (draft.industryType && industryTypes.includes(draft.industryType)) {
          setIndustryType(draft.industryType);
        }
        setLogoUrl(draft.logoUrl);
        setDescription(draft.description);

        if (draft.kyc) {
          setDocumentType(draft.kyc.documentType);
          setDocumentUrl(draft.kyc.documentUrl);
          setSelfieWithIdUrl(draft.kyc.selfieWithIdUrl);
        }
        if (draft.address) {
          const normalizedCountry = normalizeCountryName(draft.address.country);
          const normalizedCity = normalizeCityNameForCountry(
            normalizedCountry,
            draft.address.city
          );
          const normalizedPostal = normalizePostalCodeForCity(
            normalizedCountry,
            normalizedCity,
            draft.address.postalCode
          );
          setAddressLine1(draft.address.addressLine1);
          setCity(normalizedCity);
          setCountry(normalizedCountry);
          setPostalCode(normalizedPostal);
          setProofOfAddressUrl(draft.address.proofOfAddressUrl);
        }
        if (draft.payout) {
          setAccountName(draft.payout.accountName);
          setAccountNumberOrIban(draft.payout.accountNumberOrIban);
          setBankName(draft.payout.bankName);
        }
        if (draft.agreements) {
          setAg1(draft.agreements.agreedToVendorTerms);
          setAg2(draft.agreements.agreedToMembershipPolicy);
          setAg3(draft.agreements.agreedToCommissionPolicy);
          setAg4(draft.agreements.agreedToDisputePolicy);
          setAg5(draft.agreements.agreedToDeliveryRules);
        }

        const { step: resumeStep, submitted: resumeSubmitted } = vendorOnboardingResumeStep(
          data.onboardingStep,
          data.status,
          data.submittedAt
        );
        setAccessToken(token);
        setStep(resumeStep);
        setSubmitted(resumeSubmitted);
      } catch {
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Success view is shorter than the wizard; keep prior scroll from leaving the viewport on the footer */
  useLayoutEffect(() => {
    if (!submitted) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [submitted]);

  const uploadVendorFile = async (kind: VendorUploadKind, file: File) => {
    if (!accessToken) {
      toast.error("Session", "Start again from step 1.");
      throw new Error("No session");
    }
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("file", file);
    const res = await fetch("/api/vendor/onboarding/upload", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    return parseApiResponse<{ url: string; publicId: string }>(res);
  };

  const uploadSelectedFile = async (kind: VendorUploadKind, file: File) => {
    setUploadKey(kind);
    try {
      return await uploadVendorFile(kind, file);
    } finally {
      setUploadKey(null);
    }
  };

  const sendEmailCode = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error("Email required", "Enter your email first.");
      return;
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      toast.error("Email required", "Enter a valid email address.");
      return;
    }
    setSendingEmailOtp(true);
    try {
      const res = await fetch("/api/vendor/onboarding/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = await parseApiResponse<{
        email: string;
        expiresAt: string;
        debugCode?: string;
      }>(res);
      setEmail(payload.email);
      setOtpUiPhase("code");
      if (payload.debugCode) {
        setDevVerificationCode(payload.debugCode);
        toast.success(
          "Verification code ready",
          "Email is not set up on this machine. Use the code shown on this page."
        );
      } else {
        setDevVerificationCode(null);
        toast.success(
          "Email sent",
          `We sent a 6-digit code to ${payload.email}. Check your inbox and spam folder.`
        );
      }
    } catch (e) {
      toast.error("Could not send code", e instanceof Error ? e.message : "Error");
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error("Email", "Enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(emailCode.trim())) {
      toast.error("Invalid code", "Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/vendor/onboarding/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: emailCode.trim() }),
      });
      const data = await parseApiResponse<{ verificationToken: string }>(res);
      setVerificationToken(data.verificationToken);
      toast.success("Email verified", "Continue to the next step.");
    } catch (e) {
      toast.error("Verification failed", e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const runStart = async () => {
    if (!verificationToken) {
      toast.error("Verify email", "Send and confirm your email code first.");
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error("Name", "Enter your full name.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error("Email", "Enter a valid email address.");
      return;
    }
    const phoneError = getPhoneValidationMessage(phone);
    if (phoneError) {
      toast.error("Phone number", phoneError);
      return;
    }
    const passwordError = getPasswordValidationMessage(password);
    if (passwordError) {
      toast.error("Password requirements", passwordError);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password", "Password and confirm password must match.");
      return;
    }
    setBusy(true);
    try {
      const availabilityRes = await fetch("/api/auth/signup/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          phone,
        }),
      });
      await parseApiResponse(availabilityRes);

      const res = await fetch("/api/vendor/onboarding/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone,
          password,
          verificationToken,
        }),
      });
      const data = await parseApiResponse<{
        tokens: { accessToken: string; refreshToken: string };
        user: unknown;
        vendor: { id: string };
      }>(res);
      setAccessToken(data.tokens.accessToken);
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      setStep(2);
      toast.success("Account created", "Continue with your store details.");
    } catch (e) {
      toast.error("Could not start", e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const patchJson = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(path, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(body),
    });
    return parseApiResponse(res);
  };

  const goNext = async () => {
    if (step === 1) {
      if (accessToken) {
        setStep(2);
        return;
      }
      await runStart();
      return;
    }
    if (!accessToken) {
      toast.error("Session", "Start again from step 1.");
      return;
    }
    setBusy(true);
    try {
      if (step === 2) {
        if (storeName.trim().length < 2) {
          toast.error("Store name", "Enter at least 2 characters.");
          setBusy(false);
          return;
        }
        const descTrimmed = description.trim();
        if (descTrimmed.length > STORE_DESCRIPTION_MAX_CHARS) {
          toast.error(
            "Store description too long",
            `Use ${STORE_DESCRIPTION_MAX_CHARS} characters or fewer. You entered ${descTrimmed.length}.`
          );
          setBusy(false);
          return;
        }
        let nextLogoUrl = logoUrl.trim();
        if (logoFile) {
          const uploaded = await uploadSelectedFile("logo", logoFile);
          nextLogoUrl = uploaded.url;
          setLogoUrl(uploaded.url);
          setLogoFile(null);
        }
        await patchJson("/api/vendor/onboarding/step-2-store", {
          storeName: storeName.trim(),
          businessType,
          ...(industryType ? { industryType } : {}),
          ...(nextLogoUrl ? { logoUrl: nextLogoUrl } : {}),
          ...(descTrimmed ? { description: descTrimmed } : {}),
        });
        setStep(3);
      } else if (step === 3) {
        let nextDocumentUrl = documentUrl.trim();
        let nextSelfieUrl = selfieWithIdUrl.trim();
        if (documentFile) {
          const uploaded = await uploadSelectedFile("kyc_document", documentFile);
          nextDocumentUrl = uploaded.url;
          setDocumentUrl(uploaded.url);
          setDocumentFile(null);
        }
        if (selfieWithIdFile) {
          const uploaded = await uploadSelectedFile("kyc_selfie", selfieWithIdFile);
          nextSelfieUrl = uploaded.url;
          setSelfieWithIdUrl(uploaded.url);
          setSelfieWithIdFile(null);
        }
        if (!nextDocumentUrl) {
          toast.error("KYC", "Attach your ID document to continue.");
          setBusy(false);
          return;
        }
        await patchJson("/api/vendor/onboarding/step-3-kyc", {
          documentType,
          documentUrl: nextDocumentUrl,
          ...(nextSelfieUrl ? { selfieWithIdUrl: nextSelfieUrl } : {}),
        });
        setStep(4);
      } else if (step === 4) {
        if (
          addressLine1.trim().length < 3 ||
          city.trim().length < 2 ||
          country.trim().length < 2 ||
          postalCode.trim().length < 2
        ) {
          toast.error("Address", "Fill in all required address fields.");
          setBusy(false);
          return;
        }
        let nextProofOfAddressUrl = proofOfAddressUrl.trim();
        if (proofOfAddressFile) {
          const uploaded = await uploadSelectedFile("address_proof", proofOfAddressFile);
          nextProofOfAddressUrl = uploaded.url;
          setProofOfAddressUrl(uploaded.url);
          setProofOfAddressFile(null);
        }
        await patchJson("/api/vendor/onboarding/step-4-address", {
          addressLine1: addressLine1.trim(),
          city: city.trim(),
          country: country.trim(),
          postalCode: postalCode.trim(),
          ...(nextProofOfAddressUrl ? { proofOfAddressUrl: nextProofOfAddressUrl } : {}),
        });
        setStep(5);
      } else if (step === 5) {
        if (!accountName.trim() || !accountNumberOrIban.trim() || !bankName.trim()) {
          toast.error("Payout", "Fill in all bank fields.");
          setBusy(false);
          return;
        }
        await patchJson("/api/vendor/onboarding/step-5-payout", {
          method: "BANK",
          accountName: accountName.trim(),
          accountNumberOrIban: accountNumberOrIban.trim(),
          bankName: bankName.trim(),
        });
        setStep(6);
      } else if (step === 6) {
        if (!ag1 || !ag2 || !ag3 || !ag4 || !ag5) {
          toast.error("Agreements", "Accept all required policies.");
          setBusy(false);
          return;
        }
        await patchJson("/api/vendor/onboarding/step-6-agreements", {
          agreedToVendorTerms: true,
          agreedToMembershipPolicy: true,
          agreedToCommissionPolicy: true,
          agreedToDisputePolicy: true,
          agreedToDeliveryRules: true,
        });
        const subRes = await fetch("/api/vendor/onboarding/submit", {
          method: "POST",
          headers: {
            ...authHeaders(),
          },
        });
        await parseApiResponse(subRes);
        setSubmitted(true);
        toast.success("Submitted", "We will review your application.");
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : "Something went wrong. Please try again.";
      toast.error("Could not save", msg);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (step <= 1) return;
    setStep((s) => s - 1);
  };

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center px-4 py-16">
        <p className="text-sm text-neutral-600">Loading…</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-20">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Application received</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            Your vendor application is <strong>pending admin approval</strong>. We will email you when
            there is an update.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-95"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full bg-neutral-50 pb-24">
      {showTopHero ? (
        <div className={VENDOR_HERO}>
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_60%_at_50%_-15%,rgba(255,255,255,0.14),transparent_52%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/15 to-transparent"
          aria-hidden
        />
        <div className="relative z-1 mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/90 shadow-sm backdrop-blur-sm sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5 text-amber-200/95" aria-hidden />
              Become a vendor
            </span>
            <h1 className="mt-4 max-w-md text-2xl font-bold leading-tight tracking-tight text-white sm:mt-5 sm:max-w-lg sm:text-3xl sm:leading-tight">
              Vendor registration
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75 sm:mt-3 sm:text-[15px]">
              Complete all steps — we&apos;ll review your application and email you when it&apos;s approved.
            </p>
          </div>

          <div
            className="mt-8 flex h-2.5 overflow-hidden rounded-full bg-black/20 p-0.5 ring-1 ring-white/10 sm:mt-9"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={6}
            aria-label={`Step ${step} of 6`}
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-white/95 via-white to-white/90 shadow-[0_0_12px_rgba(255,255,255,0.35)] transition-[width] duration-500 ease-out"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>

          <ol className="mt-5 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 sm:mt-6 sm:gap-x-2">
            {stepsMeta.map((label, i) => {
              const n = i + 1;
              const active = n === step;
              const done = n < step;
              return (
                <li key={label}>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs ${
                      active
                        ? "border-white/40 bg-white/15 text-white shadow-md ring-1 ring-white/20"
                        : done
                          ? "border-white/20 bg-white/10 text-white/95"
                          : "border-white/10 bg-black/15 text-white/45"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] tabular-nums ${
                        done ? "bg-emerald-400/25 text-emerald-100" : active ? "bg-white/25 text-white" : "bg-white/10 text-white/50"
                      }`}
                    >
                      {n}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="mt-4 text-center text-xs font-medium text-white/80 sm:mt-5 sm:text-sm">
            Step <span className="tabular-nums text-white">{step}</span> of{" "}
            <span className="tabular-nums">6</span>
            <span className="text-white/50"> · </span>
            <span className="text-white">{stepsMeta[step - 1]}</span>
          </p>
        </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg sm:p-10 lg:p-12">
          {step === 1 && (
            <div className={STEP_STACK}>
              {!verificationToken ? (
                <section className={SECTION}>
                  {otpUiPhase === "email" ? (
                    <div className="flex flex-col gap-8">
                      <div>
                        <h2 className={SECTION_HEADING}>Verify your email</h2>
                        <p className={SECTION_LEAD}>
                          We&apos;ll send a one-time code. Use the same address you&apos;ll use to log in.
                        </p>
                      </div>
                      <div className={FIELD}>
                        <label className={LABEL} htmlFor="vo-email">
                          Email
                          <RequiredMark />
                        </label>
                        <input
                          id="vo-email"
                          type="email"
                          autoComplete="email"
                          className={CONTROL}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={sendEmailCode}
                          disabled={sendingEmailOtp || !email.trim()}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 sm:w-auto"
                        >
                          {sendingEmailOtp ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                              Sending…
                            </>
                          ) : (
                            "Send code"
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 sm:gap-8">
                      <div>
                        <h2 className={SECTION_HEADING}>Enter your code</h2>
                        <p className={SECTION_LEAD}>
                          {devVerificationCode ? (
                            <>
                              Use the verification code shown below for{" "}
                              <span className="font-semibold text-neutral-900">
                                {email.trim()}
                              </span>
                              . No email was sent because SMTP is not configured.
                            </>
                          ) : (
                            <>
                              We sent a 6-digit code to{" "}
                              <span className="font-semibold text-neutral-900">
                                {email.trim()}
                              </span>
                              . Check your inbox and spam folder.
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={sendEmailCode}
                          disabled={sendingEmailOtp}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
                        >
                          {sendingEmailOtp ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                              Sending…
                            </>
                          ) : (
                            "Resend code"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpUiPhase("email");
                            setEmailCode("");
                            setDevVerificationCode(null);
                          }}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          Change email
                        </button>
                      </div>
                      {devVerificationCode ? (
                        <div
                          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 sm:px-5 sm:py-5"
                          role="status"
                          aria-live="polite"
                        >
                          <p className="text-sm font-semibold text-amber-950">
                            Development mode — no email was sent
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed text-amber-900/90">
                            Add SMTP settings to <code className="text-xs">.env.local</code> to
                            receive codes by email. For now, enter this code:
                          </p>
                          <p
                            className="mt-4 text-center font-mono text-3xl font-bold tracking-[0.35em] text-amber-950 tabular-nums sm:text-4xl"
                            aria-label={`Verification code ${devVerificationCode.split("").join(" ")}`}
                          >
                            {devVerificationCode}
                          </p>
                        </div>
                      ) : null}
                      <div className={FIELD}>
                        <label className={LABEL} htmlFor="vo-code">
                          Verification code
                          <RequiredMark />
                        </label>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
                          <input
                            id="vo-code"
                            inputMode="numeric"
                            maxLength={6}
                            autoComplete="one-time-code"
                            placeholder="••••••"
                            className={`${CONTROL} text-center font-mono text-lg tracking-[0.2em] sm:max-w-52 sm:text-left sm:tracking-widest`}
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                            disabled={sendingEmailOtp}
                          />
                          <button
                            type="button"
                            onClick={verifyEmailCode}
                            disabled={busy || sendingEmailOtp}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
                          >
                            Verify code
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              ) : null}

              {verificationToken ? (
                <section className={SECTION}>
                  <h2 className={SECTION_HEADING}>Your account</h2>
                  <p className={SECTION_LEAD}>Legal name, phone, and password for your vendor login.</p>

                  <fieldset className="mt-8 min-w-0 space-y-0 border-0 p-0">
                    <legend className="sr-only">Profile and password</legend>
                    <div className="flex flex-col gap-6 sm:gap-8">
                      <div className={FIELD}>
                        <label className={LABEL} htmlFor="vo-name">
                          Full name
                          <RequiredMark />
                        </label>
                        <input
                          id="vo-name"
                          className={CONTROL}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          autoComplete="name"
                        />
                      </div>
                      <PhoneNumberField
                        id="vo-phone"
                        required
                        value={phone}
                        onChange={setPhone}
                        hint="Pick the flag and dial code, then enter your mobile number using digits only (no leading 0)."
                      />
                      <div className={FIELD}>
                        <label className={LABEL} htmlFor="vo-pass">
                          Password
                          <RequiredMark />
                        </label>
                        <PasswordInput
                          id="vo-pass"
                          className={CONTROL}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Create a strong password"
                          aria-describedby="vo-pass-requirements"
                        />
                        <div id="vo-pass-requirements">
                          <PasswordRequirements password={password} />
                        </div>
                      </div>
                      <div className={FIELD}>
                        <label className={LABEL} htmlFor="vo-pass2">
                          Confirm password
                          <RequiredMark />
                        </label>
                        <PasswordInput
                          id="vo-pass2"
                          className={CONTROL}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Re-enter your password"
                          aria-invalid={
                            confirmPassword.length > 0 && password !== confirmPassword
                          }
                        />
                        {confirmPassword.length > 0 && password !== confirmPassword ? (
                          <p className={HINT} role="alert">
                            Passwords do not match.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </fieldset>
                </section>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div className={STEP_STACK}>
              <div className={FIELD}>
                <label className={LABEL}>Store name
                  <RequiredMark />
                </label>
                <input className={CONTROL} value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-4 text-sm text-neutral-600 sm:px-5 sm:py-4">
                <span className="font-semibold text-neutral-900">Store URL preview</span>
                <p className="mt-2 break-all font-mono text-xs text-neutral-700 sm:text-sm">
                  …/vendors/{slugPreview || "your-store"}
                </p>
                <p className={`${HINT} mt-3`}>Saved when you continue; must be unique.</p>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Business type
                  <RequiredMark />
                </label>
                <select
                  className={CONTROL}
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                >
                  {businessTypes.map((b) => (
                    <option key={b} value={b}>
                      {b === "INDIVIDUAL" ? "Individual" : "Registered business"}
                    </option>
                  ))}
                </select>
              </div>
              <div className={FIELD}>
                <label className={LABEL}>Industry type</label>
                <select
                  className={CONTROL}
                  value={industryType}
                  onChange={(e) => setIndustryType(e.target.value as IndustryType | "")}
                >
                  <option value="">— Select industry —</option>
                  {industryTypes.map((t) => (
                    <option key={t} value={t}>
                      {industryTypeLabels[t]}
                    </option>
                  ))}
                </select>
                <p className={HINT}>Optional. Helps customers find your store.</p>
              </div>
              <FileAttachmentField
                label="Logo (optional)"
                accept="image/jpeg,image/png,image/webp"
                disabled={Boolean(uploadKey)}
                hint="JPG, PNG, or WebP — max 10 MB."
                attachedFileName={logoFile?.name ?? null}
                hasSavedFile={Boolean(logoUrl)}
                savedText="A logo is already saved for this draft."
                onSelect={setLogoFile}
              />
              <div className={FIELD}>
                <label className={LABEL} htmlFor="vendor-store-description">
                  Description (optional)
                </label>
                <textarea
                  id="vendor-store-description"
                  className={`${CONTROL} min-h-28 resize-y ${
                    descriptionOverLimit
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/25"
                      : ""
                  }`}
                  value={description}
                  maxLength={STORE_DESCRIPTION_MAX_CHARS}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-invalid={descriptionOverLimit}
                  aria-describedby="vendor-store-description-hint vendor-store-description-count"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p id="vendor-store-description-hint" className={`${HINT}`}>
                    Optional. Maximum {STORE_DESCRIPTION_MAX_CHARS} characters; longer text is not accepted.
                  </p>
                  <p
                    id="vendor-store-description-count"
                    className={`text-xs tabular-nums ${
                      descriptionOverLimit ? "font-medium text-red-600" : "text-neutral-500"
                    }`}
                  >
                    {descriptionTrimLen} / {STORE_DESCRIPTION_MAX_CHARS}
                  </p>
                </div>
                {descriptionOverLimit ? (
                  <p className="text-xs font-medium text-red-600" role="alert">
                    Please shorten your description to {STORE_DESCRIPTION_MAX_CHARS} characters or fewer.
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={STEP_STACK}>
              <p className="text-sm leading-relaxed text-neutral-600">
                We use this to verify who is selling on the marketplace.
              </p>
              <div className={FIELD}>
                <label className={LABEL}>ID type
                  <RequiredMark />
                </label>
                <select
                  className={CONTROL}
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as KycDocumentType)}
                >
                  {kycDocumentTypes.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <FileAttachmentField
                required
                label="ID document"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                disabled={Boolean(uploadKey)}
                hint="Image or PDF — max 10 MB."
                attachedFileName={documentFile?.name ?? null}
                hasSavedFile={Boolean(documentUrl)}
                savedText="An ID document is already saved for this draft."
                onSelect={setDocumentFile}
              />
              <FileAttachmentField
                label="Selfie with ID (optional)"
                accept="image/jpeg,image/png,image/webp"
                disabled={Boolean(uploadKey)}
                hint="JPG, PNG, or WebP — max 10 MB."
                attachedFileName={selfieWithIdFile?.name ?? null}
                hasSavedFile={Boolean(selfieWithIdUrl)}
                savedText="A selfie is already saved for this draft."
                onSelect={setSelfieWithIdFile}
              />
            </div>
          )}

          {step === 4 && (
            <div className={STEP_STACK}>
              <div className={FIELD}>
                <label className={LABEL}>Address line 1
                  <RequiredMark />
                </label>
                <AddressAutocompleteInput
                  className={CONTROL}
                  value={addressLine1}
                  countryCodes={shippingCountryIsoCodes}
                  onTextChange={setAddressLine1}
                  onPlaceSelect={(place) => {
                    setAddressLine1(place.addressLine1);
                    if (place.country) {
                      const matchedCountry = normalizeCountryName(place.country);
                      setCountry(matchedCountry);
                      const matchedCity = place.city
                        ? normalizeCityNameForCountry(matchedCountry, place.city)
                        : "";
                      setCity(matchedCity);
                      setPostalCode(
                        matchedCity && place.postalCode
                          ? normalizePostalCodeForCity(matchedCountry, matchedCity, place.postalCode)
                          : ""
                      );
                    }
                  }}
                />
              </div>
              <SearchableSelect
                label="Country"
                required
                value={country}
                options={countryOptions}
                placeholder="Select country"
                searchPlaceholder="Search countries…"
                onChange={(value) => {
                  setCountry(value);
                  setCity("");
                  setPostalCode("");
                }}
                emptyMessage="No countries match your search"
              />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <SearchableSelect
                  label="City"
                  required
                  value={city}
                  options={cityOptions}
                  placeholder={country ? "Select or search city" : "Select a country first"}
                  searchPlaceholder="Search cities…"
                  disabled={!country}
                  allowCustom
                  onChange={(value) => {
                    setCity(sanitizeCityCountryInput(value));
                    setPostalCode("");
                  }}
                  emptyMessage={
                    country
                      ? "No cities match — type to use a custom city"
                      : "Choose a country first"
                  }
                />
                <SearchableSelect
                  label="Postal code"
                  required
                  value={postalCode}
                  options={postalOptions}
                  placeholder={city ? "Select or search postal code" : "Select a city first"}
                  searchPlaceholder="Search postal codes…"
                  disabled={!city}
                  allowCustom
                  onChange={(value) => setPostalCode(sanitizePostalCodeInput(value))}
                  emptyMessage={
                    city
                      ? "No postal codes match — type to enter manually"
                      : "Choose a city first"
                  }
                />
              </div>
              <FileAttachmentField
                label="Proof of address (optional)"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                disabled={Boolean(uploadKey)}
                hint="Image or PDF — max 10 MB."
                attachedFileName={proofOfAddressFile?.name ?? null}
                hasSavedFile={Boolean(proofOfAddressUrl)}
                savedText="A proof document is already saved for this draft."
                onSelect={setProofOfAddressFile}
              />
            </div>
          )}

          {step === 5 && (
            <div className={STEP_STACK}>
              <p className={CALLOUT}>Account name must match your ID or business name.</p>
              <div className="flex flex-col gap-6 sm:gap-8">
                <div className={FIELD}>
                  <label className={LABEL}>Account name
                    <RequiredMark />
                  </label>
                  <input className={CONTROL} value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                </div>
                <div className={FIELD}>
                  <label className={LABEL}>Account number / IBAN
                    <RequiredMark />
                  </label>
                  <input className={CONTROL} value={accountNumberOrIban} onChange={(e) => setAccountNumberOrIban(e.target.value)} />
                </div>
                <div className={FIELD}>
                  <label className={LABEL}>Bank name
                    <RequiredMark />
                  </label>
                  <input className={CONTROL} value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col gap-3 sm:gap-4">
              <p className="text-sm font-medium leading-relaxed text-neutral-800">
                {t("intro")}
              </p>
              <label className={CHECK_ROW}>
                <input type="checkbox" checked={ag1} onChange={(e) => setAg1(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary" />
                <span>{t("vendorTerms")}<RequiredMark /></span>
              </label>
              <label className={CHECK_ROW}>
                <input type="checkbox" checked={ag2} onChange={(e) => setAg2(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary" />
                <span>
                  {t("membership", {
                    fee: membershipFeeLabel,
                    trialDays: membershipTrialDays,
                  })}
                  <RequiredMark />
                </span>
              </label>
              <label className={CHECK_ROW}>
                <input type="checkbox" checked={ag3} onChange={(e) => setAg3(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary" />
                <span>
                  {t("transactionFee", { fee: transactionFeeLabel })}
                  <RequiredMark />
                </span>
              </label>
              <label className={CHECK_ROW}>
                <input type="checkbox" checked={ag4} onChange={(e) => setAg4(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary" />
                <span>{t("disputes")}<RequiredMark /></span>
              </label>
              <label className={CHECK_ROW}>
                <input type="checkbox" checked={ag5} onChange={(e) => setAg5(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary" />
                <span>{t("delivery")}<RequiredMark /></span>
              </label>
            </div>
          )}

          <div className="mt-12 flex flex-col-reverse gap-4 border-t border-neutral-200 pt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || busy || Boolean(uploadKey) || sendingEmailOtp}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={
                busy ||
                Boolean(uploadKey) ||
                sendingEmailOtp ||
                (step === 1 && (!verificationToken || !fullName.trim() || !isValidPhone(phone)))
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-45"
            >
              {step === 6 ? "Submit application" : "Next"}
              {step !== 6 ? <ChevronRight className="h-4 w-4" /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
