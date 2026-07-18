"use client";

import { Link } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  User,
  UploadCloud,
  X,
} from "lucide-react";

import {
  businessTypes,
  industryTypes,
  kycDocumentTypes,
} from "@/domain/vendor/vendor-types";
import type { BusinessType, IndustryType, KycDocumentType } from "@/domain/vendor/vendor-types";
import type { VendorUploadKind } from "@/domain/vendor/vendor-upload-kind";
import type { OnboardingStatusPayload } from "@/components/vendor/onboarding/types";
import { PasswordRequirements } from "@/components/vendor/onboarding/PasswordRequirements";
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

const AddressAutocompleteInput = dynamic(
  () => import("@/components/address/AddressAutocompleteInput").then((mod) => mod.AddressAutocompleteInput),
  { ssr: false }
);

const STORE_DESCRIPTION_MAX_CHARS = 500;
const LOCAL_DRAFT_KEY = "vendor_onboarding_ui_draft_v3";
const STEP_COUNT = 6;

const INPUT_BASE =
  "peer h-13 w-full rounded-xl border border-neutral-300 bg-white px-4 pt-4 pb-2 text-sm text-neutral-900 shadow-[0_6px_18px_-14px_rgba(15,23,42,0.35)] outline-none transition placeholder:text-transparent focus:border-primary/70 focus:ring-4 focus:ring-primary/12";

const textAreaBase =
  "peer min-h-32 w-full rounded-xl border border-neutral-300 bg-white px-4 pt-5 pb-3 text-sm text-neutral-900 shadow-[0_6px_18px_-14px_rgba(15,23,42,0.35)] outline-none transition placeholder:text-transparent focus:border-primary/70 focus:ring-4 focus:ring-primary/12";

type UploadZoneProps = {
  id: string;
  title: string;
  hint: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  savedUrl?: string;
  required?: boolean;
  disabled?: boolean;
};

type StepHeaderProps = {
  title: string;
  description: string;
};

type FloatingInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "tel";
  autoComplete?: string;
  required?: boolean;
  error?: string | null;
  success?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  icon?: React.ReactNode;
};

type AgreementAccordionProps = {
  id: string;
  title: string;
  summary: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const stepIndexes = [1, 2, 3, 4, 5, 6] as const;

function OtpCodeInput({ value, onChange, disabled = false }: OtpCodeInputProps) {
  const tWizard = useTranslations("VendorPages.register.wizard");
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => {
    const clean = value.replace(/\D/g, "").slice(0, 6);
    return Array.from({ length: 6 }, (_, index) => clean[index] ?? "");
  }, [value]);

  const updateDigit = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(next.join(""));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={`otp-${index}`}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index] && index > 0) {
              refs.current[index - 1]?.focus();
            }
            if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
            if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!pasted) return;
            onChange(pasted);
            refs.current[Math.min(pasted.length, 6) - 1]?.focus();
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={tWizard("otp.codeDigitAria", { number: index + 1 })}
          className="h-12 w-11 rounded-xl border border-neutral-300 bg-white text-center text-lg font-semibold text-neutral-900 shadow-[0_6px_18px_-14px_rgba(15,23,42,0.35)] outline-none transition focus:border-primary/70 focus:ring-4 focus:ring-primary/12 sm:h-14 sm:w-12"
        />
      ))}
    </div>
  );
}

function StepIndicator({
  label,
  state,
}: {
  label: string;
  state: "valid" | "invalid" | "idle";
}) {
  if (state === "idle") return null;
  return (
    <p
      className={`mt-2 inline-flex items-center gap-1 text-xs ${state === "valid" ? "text-emerald-600" : "text-rose-600"}`}
      role={state === "invalid" ? "alert" : "status"}
    >
      {state === "valid" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {label}
    </p>
  );
}

function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required = false,
  error,
  success = false,
  placeholder = label,
  inputMode,
  maxLength,
  icon,
}: FloatingInputProps) {
  return (
    <div>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          className={`${INPUT_BASE} ${icon ? "pl-11" : ""} ${error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15" : ""} ${success ? "border-emerald-300" : ""}`}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          required={required}
          inputMode={inputMode}
          maxLength={maxLength}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-neutral-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-primary peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:font-medium"
        >
          {label}
          {required ? <span className="text-rose-500"> *</span> : null}
        </label>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={false}
        animate={{ width: `${Math.max(2, Math.min(percent, 100))}%` }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </div>
  );
}

function VendorStepper({ step }: { step: number }) {
  const tWizard = useTranslations("VendorPages.register.wizard");
  const stepLabels = [
    tWizard("steps.account"),
    tWizard("steps.store"),
    tWizard("steps.identity"),
    tWizard("steps.address"),
    tWizard("steps.payout"),
    tWizard("steps.agreements"),
  ];

  return (
    <div className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/95 py-5 backdrop-blur">
      <div className="mx-auto hidden max-w-[850px] items-center px-4 md:flex">
        {stepIndexes.map((item, index) => {
          const isDone = item < step;
          const isCurrent = item === step;
          return (
            <div key={`step-${item}`} className="flex min-w-0 flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isDone ? "rgb(22 163 74)" : isCurrent ? "var(--color-primary)" : "rgb(229 229 229)",
                    color: isDone || isCurrent ? "rgb(255 255 255)" : "rgb(82 82 82)",
                    scale: isCurrent ? 1.04 : 1,
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shadow-sm"
                >
                  {isDone ? <Check className="h-4 w-4" /> : item}
                </motion.div>
                <span className={`text-xs font-medium ${isCurrent ? "text-neutral-900" : "text-neutral-500"}`}>
                  {stepLabels[index]}
                </span>
              </div>
              {index !== stepIndexes.length - 1 ? (
                <div className="mx-3 h-[2px] flex-1 overflow-hidden rounded-full bg-neutral-200">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={false}
                    animate={{ width: step > item ? "100%" : "0%" }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mx-auto max-w-[850px] px-4 md:hidden">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {tWizard("stepOf", { current: step, total: STEP_COUNT })}
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-900">{stepLabels[step - 1]}</p>
        <div className="mt-3">
          <ProgressBar percent={(step / STEP_COUNT) * 100} />
        </div>
      </div>
    </div>
  );
}

function StepHeader({ title, description }: StepHeaderProps) {
  return (
    <div className="space-y-2.5">
      <h2 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-[1.95rem]">{title}</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">{description}</p>
    </div>
  );
}

function StepFooter({
  canGoBack,
  busy,
  onBack,
  onNext,
  finalStep,
  disabled,
}: {
  canGoBack: boolean;
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
  finalStep: boolean;
  disabled: boolean;
}) {
  const tCommon = useTranslations("Common");
  const tWizard = useTranslations("VendorPages.register.wizard");
  return (
    <div className="mt-8 border-t border-neutral-200 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" />
          {tCommon("back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 ${finalStep ? "w-full" : "w-full sm:w-auto"}`}
        >
          {finalStep ? tWizard("actions.submitApplication") : tWizard("actions.next")}
          {!finalStep ? <ChevronRight className="h-4 w-4" /> : null}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const tWizard = useTranslations("VendorPages.register.wizard");
  const rules = [
    { label: tWizard("password.rules.length"), ok: password.length >= 8 },
    { label: tWizard("password.rules.number"), ok: /\d/.test(password) },
    { label: tWizard("password.rules.uppercase"), ok: /[A-Z]/.test(password) },
    { label: tWizard("password.rules.special"), ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = rules.filter((rule) => rule.ok).length;
  const tone =
    score <= 1
      ? tWizard("password.strength.weak")
      : score <= 3
        ? tWizard("password.strength.medium")
        : tWizard("password.strength.strong");
  const color = score <= 1 ? "bg-rose-500" : score <= 3 ? "bg-amber-500" : "bg-emerald-500";
  const percent = (score / rules.length) * 100;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-700">{tWizard("password.title")}</span>
        <span className="font-semibold text-neutral-600">{tone}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
        <motion.div className={`h-full ${color}`} initial={false} animate={{ width: `${percent}%` }} transition={{ duration: 0.2 }} />
      </div>
      <div className="mt-3">
        <PasswordRequirements password={password} />
      </div>
    </div>
  );
}

function UploadZone({
  id,
  title,
  hint,
  accept,
  file,
  onChange,
  savedUrl,
  required = false,
  disabled = false,
}: UploadZoneProps) {
  const tCommon = useTranslations("Common");
  const tWizard = useTranslations("VendorPages.register.wizard");
  const inputRef = useRef<HTMLInputElement>(null);
  const progress = file ? 100 : 0;

  const previewUrl = useMemo(() => {
    if (!file) return null;
    if (!file.type.startsWith("image/")) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 sm:p-5">
      <p className="text-sm font-semibold text-neutral-900">
        {title}
        {required ? <span className="text-rose-500"> *</span> : null}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>

      <div
        className="mt-4 flex min-h-36 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (disabled) return;
          const dropped = event.dataTransfer.files?.[0];
          if (!dropped) return;
          onChange(dropped);
        }}
      >
        {file ? (
          <div className="w-full space-y-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{file.name}</p>
                <p className="text-xs text-neutral-500">
                  {tWizard("upload.fileSizeKb", { size: Math.ceil(file.size / 1024) })}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                onClick={() => onChange(null)}
              >
                {tCommon("remove")}
              </button>
            </div>
            <ProgressBar percent={progress} />
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={`${title} preview`}
                width={640}
                height={360}
                unoptimized
                className="max-h-40 w-auto rounded-xl border border-neutral-200 object-cover"
              />
            ) : (
              <p className="text-xs text-neutral-500">{tWizard("upload.previewUnavailable")}</p>
            )}
          </div>
        ) : savedUrl ? (
          <div className="w-full text-left">
            <p className="text-sm font-medium text-neutral-900">{tWizard("upload.savedFileTitle")}</p>
            <p className="mt-1 text-xs text-neutral-500">{tWizard("upload.savedFileHint")}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UploadCloud className="h-4 w-4" />
            {tWizard("upload.browse")}
          </button>
        )}
      </div>

      <input
        id={id}
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = "";
          onChange(selected ?? null);
        }}
      />
    </div>
  );
}

function AgreementAccordion({ id, title, summary, checked, onChange }: AgreementAccordionProps) {
  const tWizard = useTranslations("VendorPages.register.wizard");
  return (
    <details className="group rounded-2xl border border-neutral-200 bg-white" open>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 sm:px-5">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600">{summary}</p>
        </div>
        <span className="mt-1 text-xs text-neutral-500 group-open:rotate-180 transition">⌄</span>
      </summary>
      <div className="border-t border-neutral-100 px-4 py-4 sm:px-5">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-800">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
            id={id}
          />
          {tWizard("agreements.iAgree")}
        </label>
      </div>
    </details>
  );
}

function AddressSection({
  addressLine1,
  setAddressLine1,
  city,
  setCity,
  country,
  setCountry,
  postalCode,
  setPostalCode,
  shippingCountryIsoCodes,
  countryOptions,
  cityOptions,
  postalOptions,
  proofOfAddressFile,
  setProofOfAddressFile,
  proofOfAddressUrl,
  uploadBusy,
  province,
  setProvince,
}: {
  addressLine1: string;
  setAddressLine1: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  postalCode: string;
  setPostalCode: (value: string) => void;
  shippingCountryIsoCodes: string[];
  countryOptions: { value: string; label: string }[];
  cityOptions: { value: string; label: string }[];
  postalOptions: { value: string; label: string }[];
  proofOfAddressFile: File | null;
  setProofOfAddressFile: (file: File | null) => void;
  proofOfAddressUrl: string;
  uploadBusy: boolean;
  province: string;
  setProvince: (value: string) => void;
}) {
  const tWizard = useTranslations("VendorPages.register.wizard");
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          {tWizard("address.streetAddress")} *
        </label>
        <AddressAutocompleteInput
          className={INPUT_BASE}
          value={addressLine1}
          countryCodes={shippingCountryIsoCodes}
          onTextChange={setAddressLine1}
          onPlaceSelect={(place) => {
            setAddressLine1(place.addressLine1);
            if (place.country) {
              const matchedCountry = normalizeCountryName(place.country);
              setCountry(matchedCountry);
              const matchedCity = place.city ? normalizeCityNameForCountry(matchedCountry, place.city) : "";
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <SearchableSelect
          label={tWizard("address.country")}
          required
          value={country}
          options={countryOptions}
          placeholder={tWizard("address.selectCountry")}
          searchPlaceholder={tWizard("address.searchCountries")}
          onChange={(value) => {
            setCountry(value);
            setCity("");
            setPostalCode("");
          }}
          emptyMessage={tWizard("address.noCountries")}
        />
        <FloatingInput
          id="vendor-province"
          label={tWizard("address.provinceState")}
          value={province}
          onChange={setProvince}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <SearchableSelect
          label={tWizard("address.city")}
          required
          value={city}
          options={cityOptions}
          placeholder={country ? tWizard("address.selectCity") : tWizard("address.selectCountryFirst")}
          searchPlaceholder={tWizard("address.searchCities")}
          disabled={!country}
          allowCustom
          onChange={(value) => {
            setCity(sanitizeCityCountryInput(value));
            setPostalCode("");
          }}
          emptyMessage={country ? tWizard("address.noCities") : tWizard("address.chooseCountryFirst")}
        />
        <SearchableSelect
          label={tWizard("address.postalCode")}
          required
          value={postalCode}
          options={postalOptions}
          placeholder={city ? tWizard("address.selectPostalCode") : tWizard("address.selectCityFirst")}
          searchPlaceholder={tWizard("address.searchPostalCodes")}
          disabled={!city}
          allowCustom
          onChange={(value) => setPostalCode(sanitizePostalCodeInput(value))}
          emptyMessage={city ? tWizard("address.noPostalCodes") : tWizard("address.chooseCityFirst")}
        />
      </div>

      <UploadZone
        id="proof-of-address"
        title={tWizard("address.proofOfAddressOptional")}
        hint={tWizard("address.proofOfAddressHint")}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        file={proofOfAddressFile}
        onChange={setProofOfAddressFile}
        savedUrl={proofOfAddressUrl}
        disabled={uploadBusy}
      />
    </div>
  );
}

export function VendorOnboardingWizard() {
  const locale = useLocale();
  const tAgreements = useTranslations("VendorPages.register.agreements");
  const tWizard = useTranslations("VendorPages.register.wizard");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [busy, setBusy] = useState(false);
  const [uploadKey, setUploadKey] = useState<VendorUploadKind | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [otpUiPhase, setOtpUiPhase] = useState<"email" | "code">("email");
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [devVerificationCode, setDevVerificationCode] = useState<string | null>(null);

  const [storeName, setStoreName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("INDIVIDUAL");
  const [industryType, setIndustryType] = useState<IndustryType | "">("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");

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
  const [province, setProvince] = useState("");

  const [accountName, setAccountName] = useState("");
  const [accountNumberOrIban, setAccountNumberOrIban] = useState("");
  const [bankName, setBankName] = useState("");
  const [stripeEmail, setStripeEmail] = useState("");

  const [ag1, setAg1] = useState(false);
  const [ag2, setAg2] = useState(false);
  const [ag3, setAg3] = useState(false);
  const [ag4, setAg4] = useState(false);
  const [ag5, setAg5] = useState(false);
  const [transactionFeeLabel, setTransactionFeeLabel] = useState("3.99% per sale");
  const [membershipFeeAmount, setMembershipFeeAmount] = useState(499);
  const [membershipCurrency, setMembershipCurrency] = useState("USD");
  const [membershipTrialDays, setMembershipTrialDays] = useState(180);

  const slugPreview = useMemo(() => slugify(storeName || tWizard("store.defaultSlug")), [storeName, tWizard]);
  const descriptionTrimLen = description.trim().length;
  const descriptionOverLimit = descriptionTrimLen > STORE_DESCRIPTION_MAX_CHARS;

  const membershipFeeLabel = useMemo(
    () => formatMoneyMinor(membershipFeeAmount, membershipCurrency, locale),
    [locale, membershipCurrency, membershipFeeAmount]
  );

  const countryOptions = useMemo(
    () =>
      SHIPPING_COUNTRIES.map((entry) => ({
        value: entry.name,
        label: `${entry.flag} ${entry.name}`,
      })),
    []
  );
  const shippingCountryIsoCodes = useMemo(() => SHIPPING_COUNTRIES.map((entry) => entry.iso), []);
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

  const authHeaders = useCallback((): Record<string, string> => {
    if (!accessToken) return {};
    return { Authorization: `Bearer ${accessToken}` };
  }, [accessToken]);

  const emailError = email.length > 0 && !EMAIL_REGEX.test(email.trim()) ? tWizard("validation.email") : null;
  const phoneError = phone.length > 0 ? getPhoneValidationMessage(phone) : null;
  const passwordError = password.length > 0 ? getPasswordValidationMessage(password) : null;
  const confirmPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword ? tWizard("validation.passwordMismatch") : null;
  const accountNameError =
    accountName.length > 0 && accountName.trim().length < 2 ? tWizard("validation.minTwoCharacters") : null;
  const accountNumberError =
    accountNumberOrIban.length > 0 && accountNumberOrIban.trim().length < 5
      ? tWizard("validation.minFiveCharacters")
      : null;
  const bankNameError =
    bankName.length > 0 && bankName.trim().length < 2 ? tWizard("validation.minTwoCharacters") : null;

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!raw) {
      setTimeout(() => setDraftHydrated(true), 0);
      return;
    }
    try {
      const draft = JSON.parse(raw) as Record<string, unknown>;
      setTimeout(() => {
        setStep(typeof draft.step === "number" ? Math.min(Math.max(draft.step, 1), STEP_COUNT) : 1);
        setFullName(String(draft.fullName ?? ""));
        setEmail(String(draft.email ?? ""));
        setPhone(String(draft.phone ?? ""));
        setPassword(String(draft.password ?? ""));
        setConfirmPassword(String(draft.confirmPassword ?? ""));
        setEmailCode(String(draft.emailCode ?? ""));
        setVerificationToken(typeof draft.verificationToken === "string" ? draft.verificationToken : null);
        setOtpUiPhase(draft.otpUiPhase === "code" ? "code" : "email");
        setStoreName(String(draft.storeName ?? ""));
        setBusinessType(draft.businessType === "REGISTERED_BUSINESS" ? "REGISTERED_BUSINESS" : "INDIVIDUAL");
        setIndustryType(typeof draft.industryType === "string" ? (draft.industryType as IndustryType) : "");
        setLogoUrl(String(draft.logoUrl ?? ""));
        setDescription(String(draft.description ?? ""));
        setDocumentType(
          typeof draft.documentType === "string" &&
            kycDocumentTypes.includes(draft.documentType as KycDocumentType)
            ? (draft.documentType as KycDocumentType)
            : "PASSPORT"
        );
        setDocumentUrl(String(draft.documentUrl ?? ""));
        setSelfieWithIdUrl(String(draft.selfieWithIdUrl ?? ""));
        setAddressLine1(String(draft.addressLine1 ?? ""));
        setCity(String(draft.city ?? ""));
        setCountry(String(draft.country ?? ""));
        setPostalCode(String(draft.postalCode ?? ""));
        setProofOfAddressUrl(String(draft.proofOfAddressUrl ?? ""));
        setProvince(String(draft.province ?? ""));
        setAccountName(String(draft.accountName ?? ""));
        setAccountNumberOrIban(String(draft.accountNumberOrIban ?? ""));
        setBankName(String(draft.bankName ?? ""));
        setStripeEmail(String(draft.stripeEmail ?? draft.paypalEmail ?? ""));
        setAg1(Boolean(draft.ag1));
        setAg2(Boolean(draft.ag2));
        setAg3(Boolean(draft.ag3));
        setAg4(Boolean(draft.ag4));
        setAg5(Boolean(draft.ag5));
      }, 0);
    } catch {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
    } finally {
      setTimeout(() => setDraftHydrated(true), 0);
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated || submitted || !ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(
        LOCAL_DRAFT_KEY,
        JSON.stringify({
          step,
          fullName,
          email,
          phone,
          password,
          confirmPassword,
          emailCode,
          verificationToken,
          otpUiPhase,
          storeName,
          businessType,
          industryType,
          logoUrl,
          description,
          documentType,
          documentUrl,
          selfieWithIdUrl,
          addressLine1,
          city,
          country,
          postalCode,
          proofOfAddressUrl,
          province,
          accountName,
          accountNumberOrIban,
          bankName,
          stripeEmail,
          ag1,
          ag2,
          ag3,
          ag4,
          ag5,
        })
      );
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    draftHydrated,
    ready,
    submitted,
    step,
    fullName,
    email,
    phone,
    password,
    confirmPassword,
    emailCode,
    verificationToken,
    otpUiPhase,
    storeName,
    businessType,
    industryType,
    logoUrl,
    description,
    documentType,
    documentUrl,
    selfieWithIdUrl,
    addressLine1,
    city,
    country,
    postalCode,
    proofOfAddressUrl,
    province,
    accountName,
    accountNumberOrIban,
    bankName,
    stripeEmail,
    ag1,
    ag2,
    ag3,
    ag4,
    ag5,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/platform/settings");
        if (!res.ok) return;
        const data = await parseApiResponse<{
          transactionFeeLabel: string;
          membershipFeeAmount: number;
          membershipCurrency: string;
          membershipTrialDays: number;
        }>(res);
        if (!cancelled) {
          setTransactionFeeLabel(data.transactionFeeLabel);
          setMembershipFeeAmount(data.membershipFeeAmount);
          setMembershipCurrency(data.membershipCurrency);
          setMembershipTrialDays(data.membershipTrialDays);
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
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
        setOtpUiPhase("code");

        setStoreName(draft.storeName);
        if (draft.businessType && businessTypes.includes(draft.businessType)) setBusinessType(draft.businessType);
        if (draft.industryType && industryTypes.includes(draft.industryType)) setIndustryType(draft.industryType);
        setLogoUrl(draft.logoUrl);
        setDescription(draft.description);

        if (draft.kyc) {
          setDocumentType(draft.kyc.documentType);
          setDocumentUrl(draft.kyc.documentUrl);
          setSelfieWithIdUrl(draft.kyc.selfieWithIdUrl);
        }
        if (draft.address) {
          const normalizedCountry = normalizeCountryName(draft.address.country);
          const normalizedCity = normalizeCityNameForCountry(normalizedCountry, draft.address.city);
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
          setPaypalEmail(draft.payout.stripeEmail ?? "");
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
  }, [draftHydrated]);

  useLayoutEffect(() => {
    if (!submitted) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    localStorage.removeItem(LOCAL_DRAFT_KEY);
  }, [submitted]);

  const uploadVendorFile = async (kind: VendorUploadKind, file: File) => {
    if (!accessToken) {
      toast.error(tWizard("toasts.sessionTitle"), tWizard("toasts.sessionStartAgain"));
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
      toast.error(tWizard("toasts.emailRequiredTitle"), tWizard("toasts.emailFirst"));
      return;
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      toast.error(tWizard("toasts.emailRequiredTitle"), tWizard("toasts.emailInvalid"));
      return;
    }
    setSendingEmailOtp(true);
    try {
      const res = await fetch("/api/vendor/onboarding/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = await parseApiResponse<{ email: string; expiresAt: string; debugCode?: string }>(res);
      setEmail(payload.email);
      setOtpUiPhase("code");
      if (payload.debugCode) {
        setDevVerificationCode(payload.debugCode);
        toast.success(
          tWizard("toasts.verificationCodeReadyTitle"),
          tWizard("toasts.verificationCodeReadyDesc")
        );
      } else {
        setDevVerificationCode(null);
        toast.success(
          tWizard("toasts.emailSentTitle"),
          tWizard("toasts.emailSentDesc", { email: payload.email })
        );
      }
    } catch (e) {
      toast.error(tWizard("toasts.couldNotSendCodeTitle"), e instanceof Error ? e.message : tWizard("toasts.error"));
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error(tWizard("toasts.emailTitle"), tWizard("toasts.emailInvalid"));
      return;
    }
    if (!/^\d{6}$/.test(emailCode.trim())) {
      toast.error(tWizard("toasts.invalidCodeTitle"), tWizard("toasts.enterSixDigitCode"));
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
      toast.success(tWizard("toasts.emailVerifiedTitle"), tWizard("toasts.emailVerifiedDesc"));
    } catch (e) {
      toast.error(tWizard("toasts.verificationFailedTitle"), e instanceof Error ? e.message : tWizard("toasts.error"));
    } finally {
      setBusy(false);
    }
  };

  const runStart = async () => {
    if (!verificationToken) {
      toast.error(tWizard("toasts.verifyEmailTitle"), tWizard("toasts.verifyEmailFirst"));
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error(tWizard("toasts.nameTitle"), tWizard("toasts.enterFullName"));
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error(tWizard("toasts.emailTitle"), tWizard("toasts.emailInvalid"));
      return;
    }
    const nextPhoneError = getPhoneValidationMessage(phone);
    if (nextPhoneError) {
      toast.error(tWizard("toasts.phoneTitle"), nextPhoneError);
      return;
    }
    const nextPasswordError = getPasswordValidationMessage(password);
    if (nextPasswordError) {
      toast.error(tWizard("toasts.passwordRequirementsTitle"), nextPasswordError);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(tWizard("toasts.passwordTitle"), tWizard("toasts.passwordMismatch"));
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
      setDirection(1);
      setStep(2);
      toast.success(tWizard("toasts.accountCreatedTitle"), tWizard("toasts.accountCreatedDesc"));
    } catch (e) {
      toast.error(tWizard("toasts.couldNotStartTitle"), e instanceof Error ? e.message : tWizard("toasts.error"));
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
        setDirection(1);
        setStep(2);
        return;
      }
      await runStart();
      return;
    }
    if (!accessToken) {
      toast.error(tWizard("toasts.sessionTitle"), tWizard("toasts.sessionStartAgain"));
      return;
    }
    setBusy(true);
    try {
      if (step === 2) {
        if (storeName.trim().length < 2) {
          toast.error(tWizard("toasts.storeNameTitle"), tWizard("toasts.storeNameMin"));
          setBusy(false);
          return;
        }
        const descTrimmed = description.trim();
        if (descTrimmed.length > STORE_DESCRIPTION_MAX_CHARS) {
          toast.error(
            tWizard("toasts.storeDescriptionTooLongTitle"),
            tWizard("toasts.storeDescriptionTooLongDesc", {
              max: STORE_DESCRIPTION_MAX_CHARS,
              count: descTrimmed.length,
            })
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
        setDirection(1);
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
          toast.error(tWizard("toasts.kycTitle"), tWizard("toasts.attachIdDocument"));
          setBusy(false);
          return;
        }
        await patchJson("/api/vendor/onboarding/step-3-kyc", {
          documentType,
          documentUrl: nextDocumentUrl,
          ...(nextSelfieUrl ? { selfieWithIdUrl: nextSelfieUrl } : {}),
        });
        setDirection(1);
        setStep(4);
      } else if (step === 4) {
        if (
          addressLine1.trim().length < 3 ||
          city.trim().length < 2 ||
          country.trim().length < 2 ||
          postalCode.trim().length < 2
        ) {
          toast.error(tWizard("toasts.addressTitle"), tWizard("toasts.addressRequiredFields"));
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
        setDirection(1);
        setStep(5);
      } else if (step === 5) {
        if (!accountName.trim() || !accountNumberOrIban.trim() || !bankName.trim()) {
          toast.error(tWizard("toasts.payoutTitle"), tWizard("toasts.payoutRequiredFields"));
          setBusy(false);
          return;
        }
        await patchJson("/api/vendor/onboarding/step-5-payout", {
          method: "BANK",
          accountName: accountName.trim(),
          accountNumberOrIban: accountNumberOrIban.trim(),
          bankName: bankName.trim(),
          ...(stripeEmail.trim() ? { stripeEmail: stripeEmail.trim() } : {}),
        });
        setDirection(1);
        setStep(6);
      } else if (step === 6) {
        if (!ag1 || !ag2 || !ag3 || !ag4 || !ag5) {
          toast.error(tWizard("toasts.agreementsTitle"), tWizard("toasts.agreementsRequired"));
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
          headers: { ...authHeaders() },
        });
        await parseApiResponse(subRes);
        setSubmitted(true);
        toast.success(tWizard("toasts.submittedTitle"), tWizard("toasts.submittedDesc"));
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : tWizard("toasts.genericError");
      toast.error(tWizard("toasts.couldNotSaveTitle"), msg);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (step <= 1) return;
    setDirection(-1);
    setStep((s) => s - 1);
  };

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tWizard("loading")}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">{tWizard("success.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600 sm:text-base">
            {tWizard("success.description")}
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white"
          >
            {tWizard("success.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f7f8fc] pb-20">
      <VendorStepper step={step} />

      <div className="mx-auto mt-4 w-full max-w-[850px] px-4 sm:mt-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={`step-${step}`}
            initial={{ x: direction > 0 ? 45 : -45, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -40 : 40, opacity: 0 }}
            transition={{ duration: 0.23, ease: "easeOut" }}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] sm:p-6 md:p-7"
          >
            {step === 1 ? (
              <div className="space-y-6">
                <StepHeader
                  title={tWizard("stepContent.account.title")}
                  description={tWizard("stepContent.account.description")}
                />

                {otpUiPhase === "email" && !verificationToken ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_140px] sm:items-end">
                    <FloatingInput
                      id="vendor-email"
                      label={tWizard("fields.email")}
                      type="email"
                      icon={<Mail className="h-4 w-4" />}
                      value={email}
                      onChange={setEmail}
                      required
                      autoComplete="email"
                      error={emailError}
                      success={Boolean(email.length > 0 && !emailError)}
                    />
                    <button
                      type="button"
                      onClick={sendEmailCode}
                      disabled={sendingEmailOtp || Boolean(emailError) || !email.trim()}
                      className="inline-flex h-13 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {sendingEmailOtp ? tWizard("actions.sending") : tWizard("actions.sendCode")}
                    </button>
                  </div>
                ) : null}

                {otpUiPhase === "code" && !verificationToken ? (
                  <div className="mx-auto mt-3 w-full max-w-2xl space-y-6 py-3 sm:py-4">
                    <div className="space-y-2 text-center">
                      <p className="text-xl font-semibold text-neutral-900">{tWizard("otp.verifyTitle")}</p>
                      <p className="text-sm text-neutral-600 sm:text-base">
                        {tWizard("otp.codeSentTo", { email: email.trim() })}
                      </p>
                    </div>
                    {devVerificationCode ? (
                      <p className="text-center text-xs text-amber-700">{tWizard("otp.devCode", { code: devVerificationCode })}</p>
                    ) : null}
                    <div className="space-y-4 text-center">
                      <p className="text-sm font-medium text-neutral-700">
                        {tWizard("otp.verificationCode")}<span className="text-rose-500"> *</span>
                      </p>
                      <OtpCodeInput
                        value={emailCode}
                        onChange={(value) => setEmailCode(value.replace(/\D/g, "").slice(0, 6))}
                        disabled={sendingEmailOtp}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 pt-1">
                      <button
                        type="button"
                        onClick={verifyEmailCode}
                        disabled={busy || sendingEmailOtp}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold"
                      >
                        {tWizard("actions.verifyCode")}
                      </button>
                      <button
                        type="button"
                        onClick={sendEmailCode}
                        disabled={sendingEmailOtp}
                        className="text-sm font-medium text-primary"
                      >
                        {sendingEmailOtp ? tWizard("actions.resending") : tWizard("actions.resendCode")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpUiPhase("email");
                          setEmailCode("");
                        }}
                        className="text-sm font-medium text-primary"
                      >
                        {tWizard("actions.changeEmail")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {verificationToken ? (
                  <>
                    <FloatingInput
                      id="vendor-full-name"
                      label={tWizard("fields.fullName")}
                      icon={<User className="h-4 w-4" />}
                      value={fullName}
                      onChange={setFullName}
                      required
                      autoComplete="name"
                      error={fullName.length > 0 && fullName.trim().length < 2 ? tWizard("validation.fullName") : null}
                      success={fullName.trim().length >= 2}
                    />

                    <PhoneNumberField
                      id="vendor-phone"
                      label={tWizard("fields.phone")}
                      required
                      value={phone}
                      onChange={setPhone}
                      hint={tWizard("fields.phoneHint")}
                    />
                    <StepIndicator
                      label={phoneError ? phoneError : tWizard("validation.phoneLooksGood")}
                      state={phone.length === 0 ? "idle" : phoneError ? "invalid" : "valid"}
                    />

                    <FloatingInput
                      id="vendor-password"
                      label={tWizard("fields.password")}
                      type="password"
                      icon={<LockKeyhole className="h-4 w-4" />}
                      value={password}
                      onChange={setPassword}
                      required
                      autoComplete="new-password"
                      error={passwordError}
                      success={Boolean(password.length > 0 && !passwordError)}
                    />
                    <PasswordStrength password={password} />

                    <FloatingInput
                      id="vendor-confirm-password"
                      label={tWizard("fields.confirmPassword")}
                      type="password"
                      icon={<LockKeyhole className="h-4 w-4" />}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      required
                      autoComplete="new-password"
                      error={confirmPasswordError}
                      success={Boolean(confirmPassword.length > 0 && !confirmPasswordError)}
                    />
                  </>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-6">
                <StepHeader
                  title={tWizard("stepContent.store.title")}
                  description={tWizard("stepContent.store.description")}
                />

                <FloatingInput
                  id="vendor-store-name"
                  label={tWizard("fields.storeName")}
                  value={storeName}
                  onChange={setStoreName}
                  required
                  error={
                    storeName.length > 0 && storeName.trim().length < 2 ? tWizard("validation.storeName") : null
                  }
                  success={storeName.trim().length >= 2}
                />
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
                  {tWizard("store.urlPreview")}: <span className="font-mono text-neutral-900">/vendors/{slugPreview}</span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">{tWizard("fields.businessType")} *</label>
                    <select
                      className={INPUT_BASE}
                      value={businessType}
                      onChange={(event) => setBusinessType(event.target.value as BusinessType)}
                    >
                      {businessTypes.map((type) => (
                        <option key={type} value={type}>
                          {type === "INDIVIDUAL" ? tWizard("store.businessTypeIndividual") : tWizard("store.businessTypeRegistered")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">{tWizard("fields.industry")}</label>
                    <select
                      className={INPUT_BASE}
                      value={industryType}
                      onChange={(event) => setIndustryType(event.target.value as IndustryType | "")}
                    >
                      <option value="">{tWizard("store.selectIndustry")}</option>
                      {industryTypes.map((type) => (
                        <option key={type} value={type}>
                          {tWizard(`store.industryTypes.${type}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <UploadZone
                  id="store-logo"
                  title={tWizard("store.logoUpload")}
                  hint={tWizard("store.logoHint")}
                  accept="image/jpeg,image/png,image/webp"
                  file={logoFile}
                  onChange={setLogoFile}
                  savedUrl={logoUrl}
                  disabled={Boolean(uploadKey)}
                />
                <UploadZone
                  id="store-banner"
                  title={tWizard("store.bannerUpload")}
                  hint={tWizard("store.bannerHint")}
                  accept="image/jpeg,image/png,image/webp"
                  file={bannerFile}
                  onChange={setBannerFile}
                  disabled={Boolean(uploadKey)}
                />

                <div>
                  <div className="relative">
                    <textarea
                      id="store-description"
                      className={`${textAreaBase} ${descriptionOverLimit ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15" : ""}`}
                      placeholder={tWizard("fields.storeDescription")}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                    <label
                      htmlFor="store-description"
                      className="pointer-events-none absolute left-4 top-4 bg-white px-1 text-xs font-medium text-neutral-500"
                    >
                      {tWizard("fields.storeDescription")}
                    </label>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-neutral-500">
                      {tWizard("store.descriptionMax", { max: STORE_DESCRIPTION_MAX_CHARS })}
                    </p>
                    <p className={`text-xs ${descriptionOverLimit ? "text-rose-600" : "text-neutral-500"}`}>
                      {descriptionTrimLen} / {STORE_DESCRIPTION_MAX_CHARS}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <StepHeader
                  title={tWizard("stepContent.identity.title")}
                  description={tWizard("stepContent.identity.description")}
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">{tWizard("fields.nationalIdType")} *</label>
                  <select
                    className={INPUT_BASE}
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value as KycDocumentType)}
                  >
                    {kycDocumentTypes.map((value) => (
                      <option key={value} value={value}>
                        {tWizard(`identity.documentTypes.${value}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <UploadZone
                  id="kyc-document"
                  title={tWizard("identity.idDocument")}
                  hint={tWizard("identity.idDocumentHint")}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  file={documentFile}
                  onChange={setDocumentFile}
                  savedUrl={documentUrl}
                  required
                  disabled={Boolean(uploadKey)}
                />
                <UploadZone
                  id="kyc-selfie"
                  title={tWizard("identity.verificationSelfieOptional")}
                  hint={tWizard("identity.verificationSelfieHint")}
                  accept="image/jpeg,image/png,image/webp"
                  file={selfieWithIdFile}
                  onChange={setSelfieWithIdFile}
                  savedUrl={selfieWithIdUrl}
                  disabled={Boolean(uploadKey)}
                />
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-6">
                <StepHeader
                  title={tWizard("stepContent.address.title")}
                  description={tWizard("stepContent.address.description")}
                />
                <AddressSection
                  addressLine1={addressLine1}
                  setAddressLine1={setAddressLine1}
                  city={city}
                  setCity={setCity}
                  country={country}
                  setCountry={setCountry}
                  postalCode={postalCode}
                  setPostalCode={setPostalCode}
                  shippingCountryIsoCodes={shippingCountryIsoCodes}
                  countryOptions={countryOptions}
                  cityOptions={cityOptions}
                  postalOptions={postalOptions}
                  proofOfAddressFile={proofOfAddressFile}
                  setProofOfAddressFile={setProofOfAddressFile}
                  proofOfAddressUrl={proofOfAddressUrl}
                  uploadBusy={Boolean(uploadKey)}
                  province={province}
                  setProvince={setProvince}
                />
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-6">
                <StepHeader
                  title={tWizard("stepContent.payout.title")}
                  description={tWizard("stepContent.payout.description")}
                />
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  {tWizard("payout.infoBox")}
                </div>

                <FloatingInput
                  id="bank-name"
                  label={tWizard("fields.bankName")}
                  icon={<Landmark className="h-4 w-4" />}
                  value={bankName}
                  onChange={setBankName}
                  required
                  error={bankNameError}
                  success={Boolean(bankName.length > 0 && !bankNameError)}
                />
                <FloatingInput
                  id="account-title"
                  label={tWizard("fields.accountTitle")}
                  icon={<User className="h-4 w-4" />}
                  value={accountName}
                  onChange={setAccountName}
                  required
                  error={accountNameError}
                  success={Boolean(accountName.length > 0 && !accountNameError)}
                />
                <FloatingInput
                  id="account-number"
                  label={tWizard("fields.accountNumberOrIban")}
                  icon={<Landmark className="h-4 w-4" />}
                  value={accountNumberOrIban}
                  onChange={setAccountNumberOrIban}
                  required
                  error={accountNumberError}
                  success={Boolean(accountNumberOrIban.length > 0 && !accountNumberError)}
                />
                <FloatingInput
                  id="stripe-email"
                  label={tWizard("fields.stripeEmailOptional")}
                  icon={<Mail className="h-4 w-4" />}
                  value={stripeEmail}
                  onChange={setStripeEmail}
                  type="email"
                  error={
                    stripeEmail.length > 0 && !EMAIL_REGEX.test(stripeEmail.trim())
                      ? tWizard("validation.stripeEmail")
                      : null
                  }
                />
              </div>
            ) : null}

            {step === 6 ? (
              <div className="space-y-6">
                <StepHeader
                  title={tWizard("stepContent.agreements.title")}
                  description={tWizard("stepContent.agreements.description")}
                />

                <AgreementAccordion id="ag-1" title={tWizard("agreements.vendorTerms")} summary={tAgreements("vendorTerms")} checked={ag1} onChange={setAg1} />
                <AgreementAccordion
                  id="ag-2"
                  title={tWizard("agreements.membershipPolicy")}
                  summary={tAgreements("membership", {
                    fee: membershipFeeLabel,
                    trialDays: membershipTrialDays,
                  })}
                  checked={ag2}
                  onChange={setAg2}
                />
                <AgreementAccordion
                  id="ag-3"
                  title={tWizard("agreements.commissionPolicy")}
                  summary={tAgreements("transactionFee", { fee: transactionFeeLabel })}
                  checked={ag3}
                  onChange={setAg3}
                />
                <AgreementAccordion id="ag-4" title={tWizard("agreements.refundDisputePolicy")} summary={tAgreements("disputes")} checked={ag4} onChange={setAg4} />
                <AgreementAccordion id="ag-5" title={tWizard("agreements.deliveryPolicy")} summary={tAgreements("delivery")} checked={ag5} onChange={setAg5} />
              </div>
            ) : null}
          </motion.section>
        </AnimatePresence>

        <StepFooter
          canGoBack={step > 1}
          busy={busy || sendingEmailOtp || Boolean(uploadKey)}
          onBack={goBack}
          onNext={goNext}
          finalStep={step === 6}
          disabled={
            busy ||
            Boolean(uploadKey) ||
            sendingEmailOtp ||
            (step === 1 &&
              (!verificationToken ||
                !fullName.trim() ||
                !isValidPhone(phone) ||
                Boolean(passwordError) ||
                Boolean(confirmPasswordError))) ||
            (step === 5 && Boolean(stripeEmail) && !EMAIL_REGEX.test(stripeEmail.trim()))
          }
        />
      </div>
    </div>
  );
}
