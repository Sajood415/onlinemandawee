"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Loader2, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";

import {
  DRESS_FITTING_OPTIONS,
  DRESS_LENGTH_OPTIONS,
  DRESS_SIZE_OPTIONS,
  DRESS_SLEEVE_OPTIONS,
  GIFT_ITEM_TYPE_OPTIONS,
  GIFT_OCCASION_OPTIONS,
  getGiftRequestFormCopy,
} from "@/components/gifts/copy";
import {
  GiftRequestMediaFields,
  type GiftMediaAttachment,
} from "@/components/gifts/GiftRequestMediaFields";
import {
  getTodayDateInputValue,
  sanitizeRecipientPhoneInput,
  validateGiftRequestField,
  validateGiftRequestForm,
  type GiftRequestFieldErrors,
  type GiftRequestFormFields,
  type GiftValidationError,
} from "@/lib/gifts/gift-request-field-validation";
import {
  sanitizeCityCountryInput,
  sanitizeNameInput,
  sanitizePhoneInput,
} from "@/lib/checkout/checkout-field-validation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { toast } from "@/lib/utils/toast";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { useAuth } from "@/store/auth-context";

const LABEL_CLASS = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500";
const ERROR_CLASS = "mt-1.5 text-xs text-red-600";

function fieldClassName(error?: string, multiline = false) {
  return `w-full border-0 border-b bg-transparent px-0 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 disabled:text-neutral-400 ${
    multiline ? "min-h-[88px] resize-y" : ""
  } ${
    error
      ? "border-red-400 focus:border-red-500"
      : "border-neutral-300 focus:border-[#0F3460]"
  }`;
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-field-error={error ? "true" : undefined}>
      <label className={LABEL_CLASS}>
        {label}
        {required ? <span className="ms-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? <p className={ERROR_CLASS}>{error}</p> : null}
    </div>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-neutral-200 pt-7 first:border-t-0 first:pt-0">
      <h3 className="mb-1 text-sm font-semibold text-neutral-900">{title}</h3>
      {hint ? <p className="mb-5 text-sm text-neutral-500">{hint}</p> : <div className="mb-5" />}
      {children}
    </section>
  );
}

const EMPTY_FORM: GiftRequestFormFields = {
  senderName: "",
  senderEmail: "",
  senderPhone: "",
  recipientName: "",
  recipientPhone: "",
  recipientCity: "",
  recipientProvince: "",
  recipientAddress: "",
  occasion: "",
  preferredDeliveryDate: "",
  itemType: "",
  dressColor: "",
  dressSize: "",
  dressSleeveType: "",
  dressLength: "",
  dressFitting: "",
  dressTexture: "",
  dressForMale: false,
  dressForFemale: false,
  preparationNotes: "",
  deliveryInstructions: "",
  budgetNote: "",
};

function getFormForAnotherRequest(form: GiftRequestFormFields): GiftRequestFormFields {
  return {
    ...EMPTY_FORM,
    senderName: form.senderName,
    senderEmail: form.senderEmail,
    senderPhone: form.senderPhone,
  };
}

type GiftRequestFormProps = {
  locale: SupportedLocale;
};

type FieldLabelKey =
  | "senderName"
  | "senderEmail"
  | "senderPhone"
  | "recipientName"
  | "recipientPhone"
  | "recipientCity"
  | "recipientProvince"
  | "recipientAddress"
  | "preferredDeliveryDate"
  | "preparationNotes"
  | "deliveryInstructions"
  | "budgetNote";

export function GiftRequestForm({ locale }: GiftRequestFormProps) {
  const copy = getGiftRequestFormCopy(locale);
  const tv = useTranslations("GiftPages.form");
  const formRef = useRef<HTMLFormElement>(null);
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState<GiftRequestFormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<GiftRequestFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [requestNumber, setRequestNumber] = useState<string | null>(null);
  const [imageAttachments, setImageAttachments] = useState<GiftMediaAttachment[]>([]);
  const [videoAttachments, setVideoAttachments] = useState<GiftMediaAttachment[]>([]);
  const minDeliveryDate = useMemo(() => getTodayDateInputValue(), []);

  const translateError = (
    field: FieldLabelKey,
    error: GiftValidationError | undefined
  ) => {
    if (!error) return undefined;
    return tv(`validation.${error.code}`, {
      field: tv(`fields.${field}`),
      min: error.min ?? 0,
      max: error.max ?? 0,
    });
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "CUSTOMER") return;
    setForm((current) => ({
      ...current,
      senderName: current.senderName || user.fullName,
      senderEmail: current.senderEmail || user.email,
      senderPhone: current.senderPhone || user.phone,
    }));
  }, [isAuthenticated, user]);

  const occasionOptions = useMemo(
    () =>
      GIFT_OCCASION_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label[locale],
      })),
    [locale]
  );

  const itemTypeOptions = useMemo(
    () =>
      GIFT_ITEM_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label[locale],
      })),
    [locale]
  );

  const dressSizeOptions = useMemo(
    () => DRESS_SIZE_OPTIONS.map((option) => ({ value: option.value, label: option.label[locale] })),
    [locale]
  );

  const dressSleeveOptions = useMemo(
    () => DRESS_SLEEVE_OPTIONS.map((option) => ({ value: option.value, label: option.label[locale] })),
    [locale]
  );

  const dressLengthOptions = useMemo(
    () => DRESS_LENGTH_OPTIONS.map((option) => ({ value: option.value, label: option.label[locale] })),
    [locale]
  );

  const dressFittingOptions = useMemo(
    () => DRESS_FITTING_OPTIONS.map((option) => ({ value: option.value, label: option.label[locale] })),
    [locale]
  );

  const isDressSelected = form.itemType === "DRESS";

  const clearFieldError = (field: keyof GiftRequestFormFields) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateField = <K extends keyof GiftRequestFormFields>(
    field: K,
    value: GiftRequestFormFields[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    clearFieldError(field);
  };

  const validateOnBlur = (field: keyof GiftRequestFormFields) => {
    const error = validateGiftRequestField(field, form[field]);
    if (error) {
      setErrors((current) => ({ ...current, [field]: error }));
    } else {
      clearFieldError(field);
    }
  };

  const scrollToFirstError = () => {
    const firstInvalid = formRef.current?.querySelector('[data-field-error="true"]');
    firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateGiftRequestForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(copy.validationSummary);
      scrollToFirstError();
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        senderName: form.senderName.trim(),
        senderEmail: form.senderEmail.trim(),
        senderPhone: form.senderPhone.trim(),
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        recipientCity: form.recipientCity.trim(),
        recipientProvince: form.recipientProvince.trim() || undefined,
        recipientAddress: form.recipientAddress.trim(),
        occasion: form.occasion || undefined,
        preferredDeliveryDate: form.preferredDeliveryDate || undefined,
        itemType: (form.itemType as "DRESS" | "") || undefined,
        dressColor: isDressSelected ? form.dressColor.trim() || undefined : undefined,
        dressSize: isDressSelected ? form.dressSize || undefined : undefined,
        dressSleeveType: isDressSelected ? form.dressSleeveType || undefined : undefined,
        dressLength: isDressSelected ? form.dressLength || undefined : undefined,
        dressFitting: isDressSelected ? form.dressFitting || undefined : undefined,
        dressTexture: isDressSelected ? form.dressTexture.trim() || undefined : undefined,
        dressForMale: isDressSelected ? form.dressForMale : undefined,
        dressForFemale: isDressSelected ? form.dressForFemale : undefined,
        preparationNotes: form.preparationNotes.trim(),
        deliveryInstructions: form.deliveryInstructions.trim(),
        budgetNote: form.budgetNote.trim() || undefined,
        imageUrls: imageAttachments.map((item) => item.url),
        videoUrls: videoAttachments.map((item) => item.url),
      };

      const response =
        isAuthenticated && user?.role === "CUSTOMER"
          ? await fetchWithAuth("/api/gift-requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/gift-requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error?.message ?? copy.submitFailed);
        return;
      }

      setRequestNumber(data.data.requestNumber);
      setForm(getFormForAnotherRequest(form));
      setImageAttachments([]);
      setVideoAttachments([]);
      setErrors({});
    } catch {
      toast.error(copy.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  if (requestNumber) {
    return (
      <div className="border-t-2 border-emerald-500 bg-white px-5 py-8 sm:px-8">
        <div className="flex items-start gap-4">
          <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-neutral-900">{copy.successTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{copy.successBody}</p>
            <p className="mt-4 text-sm text-neutral-900">
              <span className="font-semibold">{copy.requestNumber}:</span>{" "}
              <span className="font-mono">{requestNumber}</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isAuthenticated && user?.role === "CUSTOMER" ? (
                <Link
                  href="/account/gift-requests"
                  className="inline-flex min-h-11 items-center justify-center bg-[#0F3460] px-5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
                >
                  {copy.trackInAccount}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setRequestNumber(null)}
                className="inline-flex min-h-11 items-center justify-center border border-neutral-300 bg-transparent px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-400"
              >
                {copy.submitAnother}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="bg-white px-5 py-7 shadow-[0_20px_50px_-28px_rgba(15,52,96,0.35)] sm:px-8 sm:py-9"
    >
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F3460]">
            {copy.requestBadge}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            {copy.requestTitle}
          </h2>
        </div>
        <p className="text-xs text-neutral-500">
          <span className="text-red-500">*</span> {copy.required}
        </p>
      </div>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-neutral-600">
        {copy.requestSubtitle}
      </p>

      <div className="space-y-8">
        <FormSection title={copy.senderSection}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label={copy.senderName} required error={translateError("senderName", errors.senderName)}>
                <input
                  className={fieldClassName(translateError("senderName", errors.senderName))}
                  value={form.senderName}
                  onChange={(event) =>
                    updateField("senderName", sanitizeNameInput(event.target.value))
                  }
                  onBlur={() => validateOnBlur("senderName")}
                  autoComplete="name"
                />
              </FormField>
            </div>
            <FormField label={copy.senderEmail} required error={translateError("senderEmail", errors.senderEmail)}>
              <input
                type="email"
                className={fieldClassName(translateError("senderEmail", errors.senderEmail))}
                value={form.senderEmail}
                onChange={(event) => updateField("senderEmail", event.target.value)}
                onBlur={() => validateOnBlur("senderEmail")}
                autoComplete="email"
              />
            </FormField>
            <FormField label={copy.senderPhone} required error={translateError("senderPhone", errors.senderPhone)}>
              <input
                className={fieldClassName(translateError("senderPhone", errors.senderPhone))}
                value={form.senderPhone}
                onChange={(event) =>
                  updateField("senderPhone", sanitizePhoneInput(event.target.value))
                }
                onBlur={() => validateOnBlur("senderPhone")}
                autoComplete="tel"
                inputMode="numeric"
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title={copy.recipientSection}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label={copy.recipientName} required error={translateError("recipientName", errors.recipientName)}>
              <input
                className={fieldClassName(translateError("recipientName", errors.recipientName))}
                value={form.recipientName}
                onChange={(event) =>
                  updateField("recipientName", sanitizeNameInput(event.target.value))
                }
                onBlur={() => validateOnBlur("recipientName")}
              />
            </FormField>
            <FormField label={copy.recipientPhone} required error={translateError("recipientPhone", errors.recipientPhone)}>
              <input
                className={fieldClassName(translateError("recipientPhone", errors.recipientPhone))}
                value={form.recipientPhone}
                onChange={(event) =>
                  updateField("recipientPhone", sanitizeRecipientPhoneInput(event.target.value))
                }
                onBlur={() => validateOnBlur("recipientPhone")}
                inputMode="numeric"
              />
            </FormField>
            <FormField label={copy.recipientCity} required error={translateError("recipientCity", errors.recipientCity)}>
              <input
                className={fieldClassName(translateError("recipientCity", errors.recipientCity))}
                value={form.recipientCity}
                onChange={(event) =>
                  updateField("recipientCity", sanitizeCityCountryInput(event.target.value))
                }
                onBlur={() => validateOnBlur("recipientCity")}
              />
            </FormField>
            <FormField label={copy.recipientProvince} error={translateError("recipientProvince", errors.recipientProvince)}>
              <input
                className={fieldClassName(translateError("recipientProvince", errors.recipientProvince))}
                value={form.recipientProvince}
                onChange={(event) =>
                  updateField("recipientProvince", sanitizeCityCountryInput(event.target.value))
                }
                onBlur={() => validateOnBlur("recipientProvince")}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label={copy.recipientAddress} required error={translateError("recipientAddress", errors.recipientAddress)}>
                <textarea
                  className={fieldClassName(translateError("recipientAddress", errors.recipientAddress), true)}
                  value={form.recipientAddress}
                  onChange={(event) => updateField("recipientAddress", event.target.value)}
                  onBlur={() => validateOnBlur("recipientAddress")}
                />
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection title={copy.giftSection}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label={copy.occasion}>
              <select
                className={fieldClassName(errors.occasion)}
                value={form.occasion}
                onChange={(event) => updateField("occasion", event.target.value)}
              >
                <option value="">{copy.occasionPlaceholder}</option>
                {occasionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={copy.preferredDate} error={translateError("preferredDeliveryDate", errors.preferredDeliveryDate)}>
              <input
                type="date"
                min={minDeliveryDate}
                className={fieldClassName(translateError("preferredDeliveryDate", errors.preferredDeliveryDate))}
                value={form.preferredDeliveryDate}
                onChange={(event) => updateField("preferredDeliveryDate", event.target.value)}
                onBlur={() => validateOnBlur("preferredDeliveryDate")}
              />
            </FormField>
            <FormField label={copy.itemType}>
              <select
                className={fieldClassName()}
                value={form.itemType}
                onChange={(event) => updateField("itemType", event.target.value)}
              >
                <option value="">{copy.itemTypePlaceholder}</option>
                {itemTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="sm:col-span-2">
              <FormField label={copy.preparationNotes} required error={translateError("preparationNotes", errors.preparationNotes)}>
                <textarea
                  className={fieldClassName(translateError("preparationNotes", errors.preparationNotes), true)}
                  value={form.preparationNotes}
                  onChange={(event) => updateField("preparationNotes", event.target.value)}
                  onBlur={() => validateOnBlur("preparationNotes")}
                  placeholder={copy.preparationPlaceholder}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField
                label={copy.deliveryInstructions}
                required
                error={translateError("deliveryInstructions", errors.deliveryInstructions)}
              >
                <textarea
                  className={fieldClassName(translateError("deliveryInstructions", errors.deliveryInstructions), true)}
                  value={form.deliveryInstructions}
                  onChange={(event) => updateField("deliveryInstructions", event.target.value)}
                  onBlur={() => validateOnBlur("deliveryInstructions")}
                  placeholder={copy.deliveryPlaceholder}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label={copy.budgetNote} error={translateError("budgetNote", errors.budgetNote)}>
                <input
                  className={fieldClassName(translateError("budgetNote", errors.budgetNote))}
                  value={form.budgetNote}
                  onChange={(event) => updateField("budgetNote", event.target.value)}
                  onBlur={() => validateOnBlur("budgetNote")}
                  placeholder={copy.budgetPlaceholder}
                />
              </FormField>
            </div>
          </div>
        </FormSection>

        {isDressSelected ? (
          <FormSection title={copy.dressSection} hint={copy.dressSectionHint}>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label={copy.dressColor}>
                <input
                  className={fieldClassName()}
                  value={form.dressColor}
                  onChange={(event) => updateField("dressColor", event.target.value)}
                  placeholder={copy.dressColorPlaceholder}
                />
              </FormField>
              <FormField label={copy.dressTexture}>
                <input
                  className={fieldClassName()}
                  value={form.dressTexture}
                  onChange={(event) => updateField("dressTexture", event.target.value)}
                  placeholder={copy.dressTexturePlaceholder}
                />
              </FormField>
              <FormField label={copy.dressSize}>
                <select
                  className={fieldClassName()}
                  value={form.dressSize}
                  onChange={(event) => updateField("dressSize", event.target.value)}
                >
                  <option value="">{copy.dressSizePlaceholder}</option>
                  {dressSizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={copy.dressSleeveType}>
                <select
                  className={fieldClassName()}
                  value={form.dressSleeveType}
                  onChange={(event) => updateField("dressSleeveType", event.target.value)}
                >
                  <option value="">{copy.dressSleeveTypePlaceholder}</option>
                  {dressSleeveOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={copy.dressLength}>
                <select
                  className={fieldClassName()}
                  value={form.dressLength}
                  onChange={(event) => updateField("dressLength", event.target.value)}
                >
                  <option value="">{copy.dressLengthPlaceholder}</option>
                  {dressLengthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={copy.dressFitting}>
                <select
                  className={fieldClassName()}
                  value={form.dressFitting}
                  onChange={(event) => updateField("dressFitting", event.target.value)}
                >
                  <option value="">{copy.dressFittingPlaceholder}</option>
                  {dressFittingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>{copy.dressGenderLabel}</label>
                <div className="flex flex-wrap items-center gap-5 border-b border-neutral-300 py-2.5">
                  <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 border-neutral-300 text-[#0F3460] focus:ring-[#0F3460]/30"
                      checked={form.dressForMale}
                      onChange={(event) => updateField("dressForMale", event.target.checked)}
                    />
                    {copy.dressForMale}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 border-neutral-300 text-[#0F3460] focus:ring-[#0F3460]/30"
                      checked={form.dressForFemale}
                      onChange={(event) => updateField("dressForFemale", event.target.checked)}
                    />
                    {copy.dressForFemale}
                  </label>
                </div>
              </div>
            </div>
          </FormSection>
        ) : null}

        <FormSection title={copy.mediaSection} hint={copy.mediaSectionHint}>
          <GiftRequestMediaFields
            locale={locale}
            imageUrls={imageAttachments}
            videoUrls={videoAttachments}
            onImageUrlsChange={setImageAttachments}
            onVideoUrlsChange={setVideoAttachments}
            disabled={submitting}
          />
        </FormSection>
      </div>

      <div className="mt-10 border-t border-neutral-200 pt-6">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 bg-[#0F3460] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? copy.submitting : copy.submit}
        </button>
      </div>
    </form>
  );
}
