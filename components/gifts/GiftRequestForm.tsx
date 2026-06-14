"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Gift, Loader2, MapPin, Send, User } from "lucide-react";
import { Link } from "@/i18n/navigation";

import {
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

const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-neutral-700";
const ERROR_CLASS = "mt-1.5 text-xs text-red-600";

function fieldClassName(error?: string, multiline = false) {
  return `w-full rounded-xl border px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 ${
    multiline ? "min-h-[120px] resize-y" : ""
  } ${
    error
      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-neutral-200 focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/15"
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
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {children}
      {error ? <p className={ERROR_CLASS}>{error}</p> : null}
    </div>
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

export function GiftRequestForm({ locale }: GiftRequestFormProps) {
  const copy = getGiftRequestFormCopy(locale);
  const formRef = useRef<HTMLFormElement>(null);
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState<GiftRequestFormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<GiftRequestFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [requestNumber, setRequestNumber] = useState<string | null>(null);
  const [imageAttachments, setImageAttachments] = useState<GiftMediaAttachment[]>([]);
  const [videoAttachments, setVideoAttachments] = useState<GiftMediaAttachment[]>([]);
  const minDeliveryDate = useMemo(() => getTodayDateInputValue(), []);

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
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-emerald-900">{copy.successTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-emerald-800">{copy.successBody}</p>
            <p className="mt-4 text-sm text-emerald-900">
              <span className="font-semibold">{copy.requestNumber}:</span>{" "}
              <span className="font-mono">{requestNumber}</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {isAuthenticated && user?.role === "CUSTOMER" ? (
                <Link
                  href="/account/gift-requests"
                  className="inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  {copy.trackInAccount}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setRequestNumber(null)}
                className="inline-flex rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
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
      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8"
    >
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#0f3460]/15 bg-[#0f3460]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f3460]">
          <Gift className="h-3.5 w-3.5" />
          {copy.requestBadge}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">{copy.requestTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{copy.requestSubtitle}</p>
        <p className="mt-2 text-xs text-neutral-500">
          <span className="text-red-500">*</span> {copy.required}
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="mb-4 flex items-center gap-2 text-[#0f3460]">
            <User className="h-4 w-4" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">{copy.senderSection}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label={copy.senderName} required error={errors.senderName}>
                <input
                  className={fieldClassName(errors.senderName)}
                  value={form.senderName}
                  onChange={(event) =>
                    updateField("senderName", sanitizeNameInput(event.target.value))
                  }
                  onBlur={() => validateOnBlur("senderName")}
                  autoComplete="name"
                />
              </FormField>
            </div>
            <FormField label={copy.senderEmail} required error={errors.senderEmail}>
              <input
                type="email"
                className={fieldClassName(errors.senderEmail)}
                value={form.senderEmail}
                onChange={(event) => updateField("senderEmail", event.target.value)}
                onBlur={() => validateOnBlur("senderEmail")}
                autoComplete="email"
              />
            </FormField>
            <FormField label={copy.senderPhone} required error={errors.senderPhone}>
              <input
                className={fieldClassName(errors.senderPhone)}
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
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2 text-[#0f3460]">
            <MapPin className="h-4 w-4" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">{copy.recipientSection}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={copy.recipientName} required error={errors.recipientName}>
              <input
                className={fieldClassName(errors.recipientName)}
                value={form.recipientName}
                onChange={(event) =>
                  updateField("recipientName", sanitizeNameInput(event.target.value))
                }
                onBlur={() => validateOnBlur("recipientName")}
              />
            </FormField>
            <FormField label={copy.recipientPhone} required error={errors.recipientPhone}>
              <input
                className={fieldClassName(errors.recipientPhone)}
                value={form.recipientPhone}
                onChange={(event) =>
                  updateField("recipientPhone", sanitizeRecipientPhoneInput(event.target.value))
                }
                onBlur={() => validateOnBlur("recipientPhone")}
                inputMode="numeric"
              />
            </FormField>
            <FormField label={copy.recipientCity} required error={errors.recipientCity}>
              <input
                className={fieldClassName(errors.recipientCity)}
                value={form.recipientCity}
                onChange={(event) =>
                  updateField("recipientCity", sanitizeCityCountryInput(event.target.value))
                }
                onBlur={() => validateOnBlur("recipientCity")}
              />
            </FormField>
            <FormField label={copy.recipientProvince} error={errors.recipientProvince}>
              <input
                className={fieldClassName(errors.recipientProvince)}
                value={form.recipientProvince}
                onChange={(event) =>
                  updateField("recipientProvince", sanitizeCityCountryInput(event.target.value))
                }
                onBlur={() => validateOnBlur("recipientProvince")}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label={copy.recipientAddress} required error={errors.recipientAddress}>
                <textarea
                  className={fieldClassName(errors.recipientAddress, true)}
                  value={form.recipientAddress}
                  onChange={(event) => updateField("recipientAddress", event.target.value)}
                  onBlur={() => validateOnBlur("recipientAddress")}
                />
              </FormField>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2 text-[#0f3460]">
            <Gift className="h-4 w-4" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">{copy.giftSection}</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <FormField label={copy.preferredDate} error={errors.preferredDeliveryDate}>
              <input
                type="date"
                min={minDeliveryDate}
                className={fieldClassName(errors.preferredDeliveryDate)}
                value={form.preferredDeliveryDate}
                onChange={(event) => updateField("preferredDeliveryDate", event.target.value)}
                onBlur={() => validateOnBlur("preferredDeliveryDate")}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label={copy.preparationNotes} required error={errors.preparationNotes}>
                <textarea
                  className={fieldClassName(errors.preparationNotes, true)}
                  value={form.preparationNotes}
                  onChange={(event) => updateField("preparationNotes", event.target.value)}
                  onBlur={() => validateOnBlur("preparationNotes")}
                  placeholder={copy.preparationPlaceholder}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label={copy.deliveryInstructions} required error={errors.deliveryInstructions}>
                <textarea
                  className={fieldClassName(errors.deliveryInstructions, true)}
                  value={form.deliveryInstructions}
                  onChange={(event) => updateField("deliveryInstructions", event.target.value)}
                  onBlur={() => validateOnBlur("deliveryInstructions")}
                  placeholder={copy.deliveryPlaceholder}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label={copy.budgetNote} error={errors.budgetNote}>
                <input
                  className={fieldClassName(errors.budgetNote)}
                  value={form.budgetNote}
                  onChange={(event) => updateField("budgetNote", event.target.value)}
                  onBlur={() => validateOnBlur("budgetNote")}
                  placeholder={copy.budgetPlaceholder}
                />
              </FormField>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0f3460]">
              {copy.mediaSection}
            </h3>
            <p className="mt-1 text-sm text-neutral-600">{copy.mediaSectionHint}</p>
          </div>
          <GiftRequestMediaFields
            locale={locale}
            imageUrls={imageAttachments}
            videoUrls={videoAttachments}
            onImageUrlsChange={setImageAttachments}
            onVideoUrlsChange={setVideoAttachments}
            disabled={submitting}
          />
        </section>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f3460] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
