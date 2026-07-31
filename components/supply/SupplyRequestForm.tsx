"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, ChevronLeft, ChevronRight, ImagePlus, Link2, Loader2, Send, Trash2, X } from "lucide-react";
import { Link } from "@/i18n/navigation";

import {
  validateSupplyRequestFields,
  type SupplyRequestFieldErrors,
  type SupplyRequestFormFields,
} from "@/lib/supply/supply-request-field-validation";
import {
  SUPPLY_IMAGE_ACCEPT,
  MAX_SUPPLY_IMAGE_MB,
  MAX_SUPPLY_REQUEST_IMAGES,
} from "@/lib/supply/supply-request-media.constants";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { toast } from "@/lib/utils/toast";
import { useAuth } from "@/store/auth-context";
import type { SupportedLocale } from "@/lib/localization/product-vendor";

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

type SuccessData = {
  requestNumber: string;
  guestTrackingToken: string;
};

type SupplyRequestFormProps = {
  locale: SupportedLocale;
};

const EMPTY_FORM: SupplyRequestFormFields = {
  productName: "",
  brand: "",
  modelSku: "",
  quantity: "1",
  description: "",
  referenceUrl: "",
  categoryHint: "",
  budgetMin: "",
  budgetMax: "",
  neededByDate: "",
  urgencyNote: "",
  allowAlternatives: true,
  deliveryMode: "SHIP",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  whatsapp: "",
  preferredContact: "",
  city: "",
  province: "",
  address: "",
};

type ImageAttachment = { url: string; uploading?: boolean };

const STEP_KEYS = ["product", "preferences", "contact"] as const;
type StepKey = (typeof STEP_KEYS)[number];

function getStepErrors(
  step: StepKey,
  errors: SupplyRequestFieldErrors
): boolean {
  const productFields: (keyof SupplyRequestFormFields)[] = [
    "productName",
    "quantity",
    "description",
  ];
  const prefFields: (keyof SupplyRequestFormFields)[] = [
    "neededByDate",
    "budgetMin",
    "budgetMax",
  ];
  const contactFields: (keyof SupplyRequestFormFields)[] = [
    "customerName",
    "customerEmail",
    "customerPhone",
    "city",
    "address",
  ];

  const fieldMap: Record<StepKey, (keyof SupplyRequestFormFields)[]> = {
    product: productFields,
    preferences: prefFields,
    contact: contactFields,
  };

  return fieldMap[step].some((field) => !!errors[field]);
}

function translateError(
  t: ReturnType<typeof useTranslations<"SupplyPages.form">>,
  field: keyof SupplyRequestFormFields,
  error: SupplyRequestFieldErrors[keyof SupplyRequestFieldErrors]
): string | undefined {
  if (!error) return undefined;
  return t(`validation.${error.code}`, {
    field: t(`fields.${field}`),
    min: error.min ?? 0,
    max: error.max ?? 0,
  });
}

export function SupplyRequestForm({ locale }: SupplyRequestFormProps) {
  const t = useTranslations("SupplyPages.form");
  const formRef = useRef<HTMLFormElement>(null);
  const { user, isAuthenticated } = useAuth();
  const isRtl = locale !== "en";

  const [form, setForm] = useState<SupplyRequestFormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<SupplyRequestFieldErrors>({});
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [currentStep, setCurrentStep] = useState<StepKey>("product");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "CUSTOMER") return;
    setForm((current) => ({
      ...current,
      customerName: current.customerName || user.fullName,
      customerEmail: current.customerEmail || user.email,
      customerPhone: current.customerPhone || user.phone,
    }));
  }, [isAuthenticated, user]);

  const updateField = <K extends keyof SupplyRequestFormFields>(
    field: K,
    value: SupplyRequestFormFields[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (imageAttachments.length >= MAX_SUPPLY_REQUEST_IMAGES) {
      toast.error(t("maxImagesReached", { max: MAX_SUPPLY_REQUEST_IMAGES }));
      return;
    }

    const tempId = URL.createObjectURL(file);
    setImageAttachments((current) => [
      ...current,
      { url: tempId, uploading: true },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "image");

      const response = await fetch("/api/supply-requests/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? t("uploadFailed"));
      setImageAttachments((current) =>
        current.map((item) => (item.url === tempId ? { url: data.data.url } : item))
      );
    } catch (error) {
      setImageAttachments((current) =>
        current.filter((item) => item.url !== tempId)
      );
      toast.error(error instanceof Error ? error.message : t("uploadFailed"));
    }
  };

  const removeImage = (url: string) => {
    setImageAttachments((current) => current.filter((item) => item.url !== url));
  };

  const addReferenceUrl = () => {
    const url = form.referenceUrl.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      toast.error(t("invalidUrl"));
      return;
    }
    if (referenceUrls.length >= 5) {
      toast.error(t("maxUrlsReached"));
      return;
    }
    setReferenceUrls((current) => [...current, url]);
    updateField("referenceUrl", "");
  };

  const removeReferenceUrl = (url: string) => {
    setReferenceUrls((current) => current.filter((item) => item !== url));
  };

  const validateStep = (step: StepKey): boolean => {
    const allErrors = validateSupplyRequestFields(form);
    const stepFields: Partial<SupplyRequestFieldErrors> = {};

    if (step === "product") {
      for (const field of ["productName", "quantity", "description"] as const) {
        if (allErrors[field]) stepFields[field] = allErrors[field];
      }
    } else if (step === "preferences") {
      for (const field of ["neededByDate", "budgetMin", "budgetMax"] as const) {
        if (allErrors[field]) stepFields[field] = allErrors[field];
      }
    } else if (step === "contact") {
      for (const field of [
        "customerName",
        "customerEmail",
        "customerPhone",
        "city",
        "address",
      ] as const) {
        if (allErrors[field]) stepFields[field] = allErrors[field];
      }
    }

    if (Object.keys(stepFields).length > 0) {
      setErrors((current) => ({ ...current, ...stepFields }));
      return false;
    }
    return true;
  };

  const goToStep = (step: StepKey) => {
    const stepIndex = STEP_KEYS.indexOf(step);
    const currentIndex = STEP_KEYS.indexOf(currentStep);
    if (stepIndex > currentIndex) {
      if (!validateStep(currentStep)) {
        toast.error(t("fixErrors"));
        return;
      }
    }
    setCurrentStep(step);
  };

  const handleNext = () => {
    const currentIndex = STEP_KEYS.indexOf(currentStep);
    if (currentIndex < STEP_KEYS.length - 1) {
      goToStep(STEP_KEYS[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = STEP_KEYS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_KEYS[currentIndex - 1]);
    }
  };

  const scrollToFirstError = () => {
    const firstInvalid = formRef.current?.querySelector('[data-field-error="true"]');
    firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const allErrors = validateSupplyRequestFields(form);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      toast.error(t("fixErrors"));
      scrollToFirstError();
      return;
    }

    const uploadingImages = imageAttachments.filter((item) => item.uploading);
    if (uploadingImages.length > 0) {
      toast.error(t("imagesStillUploading"));
      return;
    }

    setSubmitting(true);
    try {
      const quantity = Number.parseInt(form.quantity, 10);
      const budgetMin = form.budgetMin.trim() ? Math.round(Number(form.budgetMin) * 100) : null;
      const budgetMax = form.budgetMax.trim() ? Math.round(Number(form.budgetMax) * 100) : null;

      const payload = {
        productName: form.productName.trim(),
        brand: form.brand.trim() || undefined,
        modelSku: form.modelSku.trim() || undefined,
        quantity,
        description: form.description.trim(),
        referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
        imageUrls:
          imageAttachments.length > 0
            ? imageAttachments.map((a) => a.url)
            : undefined,
        categoryHint: form.categoryHint.trim() || undefined,
        budgetMinMinor: budgetMin,
        budgetMaxMinor: budgetMax,
        budgetCurrency: budgetMin != null || budgetMax != null ? "USD" : undefined,
        neededByDate: form.neededByDate.trim() || undefined,
        urgencyNote: form.urgencyNote.trim() || undefined,
        allowAlternatives: form.allowAlternatives,
        deliveryMode: form.deliveryMode,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        whatsapp: form.whatsapp.trim() || undefined,
        preferredContact: form.preferredContact.trim() || undefined,
        city: form.city.trim(),
        province: form.province.trim() || undefined,
        address: form.address.trim(),
      };

      const response =
        isAuthenticated && user?.role === "CUSTOMER"
          ? await fetchWithAuth("/api/supply-requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/supply-requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error?.message ?? t("submitFailed"));
        return;
      }

      setSuccess({
        requestNumber: data.data.requestNumber,
        guestTrackingToken: data.data.guestTrackingToken,
      });
      setForm(EMPTY_FORM);
      setImageAttachments([]);
      setReferenceUrls([]);
      setErrors({});
      setCurrentStep("product");
    } catch {
      toast.error(t("submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="border-t-2 border-emerald-500 bg-white px-5 py-8 sm:px-8">
        <div className="flex items-start gap-4">
          <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-neutral-900">{t("successTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{t("successBody")}</p>
            <p className="mt-4 text-sm text-neutral-900">
              <span className="font-semibold">{t("requestNumber")}:</span>{" "}
              <span className="font-mono">{success.requestNumber}</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/supply-request/track?token=${success.guestTrackingToken}`}
                className="inline-flex min-h-11 items-center justify-center bg-[#0F3460] px-5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
              >
                {t("trackRequest")}
              </Link>
              {isAuthenticated && user?.role === "CUSTOMER" ? (
                <Link
                  href="/account/supply-requests"
                  className="inline-flex min-h-11 items-center justify-center border border-[#0F3460] px-5 text-sm font-semibold text-[#0F3460] transition hover:bg-[#0F3460]/5"
                >
                  {t("trackInAccount")}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="inline-flex min-h-11 items-center justify-center border border-neutral-300 bg-transparent px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-400"
              >
                {t("submitAnother")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepIndex = STEP_KEYS.indexOf(currentStep);

  return (
    <div className="bg-white px-5 py-7 shadow-[0_20px_50px_-28px_rgba(15,52,96,0.35)] sm:px-8 sm:py-9">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F3460]">
            {t("requestBadge")}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            {t("requestTitle")}
          </h2>
        </div>
        <p className="text-xs text-neutral-500">
          <span className="text-red-500">*</span> {t("required")}
        </p>
      </div>

      {/* Step indicators */}
      <div dir={isRtl ? "rtl" : "ltr"} className="mb-8 flex items-center gap-0">
        {STEP_KEYS.map((step, index) => {
          const isActive = step === currentStep;
          const isPast = STEP_KEYS.indexOf(step) < stepIndex;
          const hasError = getStepErrors(step, errors);
          return (
            <div key={step} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => goToStep(step)}
                className="flex flex-col items-center gap-1 text-center"
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                    isActive
                      ? "bg-[#0F3460] text-white"
                      : isPast
                      ? "bg-emerald-500 text-white"
                      : hasError
                      ? "bg-red-100 text-red-700"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {isPast && !hasError ? "✓" : index + 1}
                </span>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    isActive ? "text-[#0F3460]" : "text-neutral-500"
                  }`}
                >
                  {t(`steps.${step}`)}
                </span>
              </button>
              {index < STEP_KEYS.length - 1 ? (
                <div className="mx-2 flex-1 border-t border-neutral-200" />
              ) : null}
            </div>
          );
        })}
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-8"
      >
        {/* Step 1: Product */}
        {currentStep === "product" ? (
          <>
            <FormSection title={t("sections.product")}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField
                    label={t("fields.productName")}
                    required
                    error={translateError(t, "productName", errors.productName)}
                  >
                    <input
                      className={fieldClassName(translateError(t, "productName", errors.productName))}
                      value={form.productName}
                      onChange={(e) => updateField("productName", e.target.value)}
                      placeholder={t("placeholders.productName")}
                    />
                  </FormField>
                </div>
                <FormField label={t("fields.brand")}>
                  <input
                    className={fieldClassName()}
                    value={form.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    placeholder={t("placeholders.brand")}
                  />
                </FormField>
                <FormField label={t("fields.modelSku")}>
                  <input
                    className={fieldClassName()}
                    value={form.modelSku}
                    onChange={(e) => updateField("modelSku", e.target.value)}
                    placeholder={t("placeholders.modelSku")}
                  />
                </FormField>
                <FormField
                  label={t("fields.quantity")}
                  required
                  error={translateError(t, "quantity", errors.quantity)}
                >
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={fieldClassName(translateError(t, "quantity", errors.quantity))}
                    value={form.quantity}
                    onChange={(e) => updateField("quantity", e.target.value)}
                  />
                </FormField>
                <FormField label={t("fields.categoryHint")}>
                  <input
                    className={fieldClassName()}
                    value={form.categoryHint}
                    onChange={(e) => updateField("categoryHint", e.target.value)}
                    placeholder={t("placeholders.categoryHint")}
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField
                    label={t("fields.description")}
                    required
                    error={translateError(t, "description", errors.description)}
                  >
                    <textarea
                      className={fieldClassName(
                        translateError(t, "description", errors.description),
                        true
                      )}
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder={t("placeholders.description")}
                    />
                  </FormField>
                </div>
              </div>
            </FormSection>

            {/* Reference URLs */}
            <FormSection title={t("sections.referenceUrls")} hint={t("hints.referenceUrls")}>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 border-0 border-b border-neutral-300 bg-transparent px-0 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#0F3460]"
                    value={form.referenceUrl}
                    onChange={(e) => updateField("referenceUrl", e.target.value)}
                    placeholder={t("placeholders.referenceUrl")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addReferenceUrl();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addReferenceUrl}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {t("addUrl")}
                  </button>
                </div>
                {referenceUrls.map((url) => (
                  <div
                    key={url}
                    className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2"
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-[#0F3460] hover:underline"
                    >
                      {url}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeReferenceUrl(url)}
                      className="shrink-0 text-neutral-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </FormSection>

            {/* Image upload */}
            <FormSection title={t("sections.images")} hint={t("hints.images", { max: MAX_SUPPLY_REQUEST_IMAGES, mb: MAX_SUPPLY_IMAGE_MB })}>
              <div className="space-y-3">
                {imageAttachments.length < MAX_SUPPLY_REQUEST_IMAGES ? (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
                    <ImagePlus className="h-4 w-4" />
                    {t("uploadImage")}
                    <input
                      type="file"
                      accept={SUPPLY_IMAGE_ACCEPT}
                      className="hidden"
                      onChange={(e) => void handleImageUpload(e)}
                    />
                  </label>
                ) : null}
                {imageAttachments.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {imageAttachments.map((item) => (
                      <div
                        key={item.url}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
                      >
                        {item.uploading ? (
                          <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                          </div>
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(item.url)}
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </FormSection>
          </>
        ) : null}

        {/* Step 2: Preferences */}
        {currentStep === "preferences" ? (
          <FormSection title={t("sections.preferences")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label={t("fields.neededByDate")}
                error={translateError(t, "neededByDate", errors.neededByDate)}
              >
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className={fieldClassName(translateError(t, "neededByDate", errors.neededByDate))}
                  value={form.neededByDate}
                  onChange={(e) => updateField("neededByDate", e.target.value)}
                />
              </FormField>
              <FormField label={t("fields.deliveryMode")} required>
                <select
                  className={fieldClassName()}
                  value={form.deliveryMode}
                  onChange={(e) =>
                    updateField("deliveryMode", e.target.value as "SHIP" | "PICKUP")
                  }
                >
                  <option value="SHIP">{t("deliveryModes.SHIP")}</option>
                  <option value="PICKUP">{t("deliveryModes.PICKUP")}</option>
                </select>
              </FormField>
              <FormField
                label={t("fields.budgetMin")}
                error={translateError(t, "budgetMin", errors.budgetMin)}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={fieldClassName(translateError(t, "budgetMin", errors.budgetMin))}
                  value={form.budgetMin}
                  onChange={(e) => updateField("budgetMin", e.target.value)}
                  placeholder={t("placeholders.budgetMin")}
                />
              </FormField>
              <FormField
                label={t("fields.budgetMax")}
                error={translateError(t, "budgetMax", errors.budgetMax)}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={fieldClassName(translateError(t, "budgetMax", errors.budgetMax))}
                  value={form.budgetMax}
                  onChange={(e) => updateField("budgetMax", e.target.value)}
                  placeholder={t("placeholders.budgetMax")}
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label={t("fields.urgencyNote")}>
                  <textarea
                    className={fieldClassName(undefined, true)}
                    value={form.urgencyNote}
                    onChange={(e) => updateField("urgencyNote", e.target.value)}
                    placeholder={t("placeholders.urgencyNote")}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <label className="inline-flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 border-neutral-300 text-[#0F3460] focus:ring-[#0F3460]/30"
                    checked={form.allowAlternatives}
                    onChange={(e) => updateField("allowAlternatives", e.target.checked)}
                  />
                  <span className="text-sm text-neutral-700">
                    {t("fields.allowAlternatives")}
                  </span>
                </label>
                <p className="mt-1 text-xs text-neutral-500">{t("hints.allowAlternatives")}</p>
              </div>
            </div>
          </FormSection>
        ) : null}

        {/* Step 3: Contact */}
        {currentStep === "contact" ? (
          <FormSection title={t("sections.contact")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  label={t("fields.customerName")}
                  required
                  error={translateError(t, "customerName", errors.customerName)}
                >
                  <input
                    className={fieldClassName(translateError(t, "customerName", errors.customerName))}
                    value={form.customerName}
                    onChange={(e) => updateField("customerName", e.target.value)}
                    autoComplete="name"
                  />
                </FormField>
              </div>
              <FormField
                label={t("fields.customerEmail")}
                required
                error={translateError(t, "customerEmail", errors.customerEmail)}
              >
                <input
                  type="email"
                  className={fieldClassName(translateError(t, "customerEmail", errors.customerEmail))}
                  value={form.customerEmail}
                  onChange={(e) => updateField("customerEmail", e.target.value)}
                  autoComplete="email"
                />
              </FormField>
              <FormField
                label={t("fields.customerPhone")}
                required
                error={translateError(t, "customerPhone", errors.customerPhone)}
              >
                <input
                  className={fieldClassName(translateError(t, "customerPhone", errors.customerPhone))}
                  value={form.customerPhone}
                  onChange={(e) => updateField("customerPhone", e.target.value)}
                  autoComplete="tel"
                  inputMode="numeric"
                />
              </FormField>
              <FormField label={t("fields.whatsapp")}>
                <input
                  className={fieldClassName()}
                  value={form.whatsapp}
                  onChange={(e) => updateField("whatsapp", e.target.value)}
                  placeholder={t("placeholders.whatsapp")}
                  inputMode="numeric"
                />
              </FormField>
              <FormField label={t("fields.preferredContact")}>
                <input
                  className={fieldClassName()}
                  value={form.preferredContact}
                  onChange={(e) => updateField("preferredContact", e.target.value)}
                  placeholder={t("placeholders.preferredContact")}
                />
              </FormField>
              <FormField
                label={t("fields.city")}
                required
                error={translateError(t, "city", errors.city)}
              >
                <input
                  className={fieldClassName(translateError(t, "city", errors.city))}
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </FormField>
              <FormField label={t("fields.province")}>
                <input
                  className={fieldClassName()}
                  value={form.province}
                  onChange={(e) => updateField("province", e.target.value)}
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField
                  label={t("fields.address")}
                  required={form.deliveryMode === "SHIP"}
                  error={translateError(t, "address", errors.address)}
                >
                  <textarea
                    className={fieldClassName(translateError(t, "address", errors.address), true)}
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder={
                      form.deliveryMode === "SHIP"
                        ? t("placeholders.addressShip")
                        : t("placeholders.addressPickup")
                    }
                  />
                </FormField>
              </div>
            </div>
          </FormSection>
        ) : null}

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-neutral-200 pt-6">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              <ChevronLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              {t("back")}
            </button>
          ) : (
            <div />
          )}

          {stepIndex < STEP_KEYS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
            >
              {t("next")}
              <ChevronRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F3460] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? t("submitting") : t("submit")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
