"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Loader2, Send } from "lucide-react";

import { Link } from "@/i18n/navigation";
import {
  HAWALA_CURRENCIES,
  HAWALA_CURRENCY_LABELS,
  type HawalaCurrency,
} from "@/lib/hawala/constants";
import { convertHawalaAmountMinor, getHawalaExchangeRate } from "@/lib/hawala/convert";
import {
  sanitizeAccountNumberInput,
  sanitizeNameLikeInput,
  sanitizePhoneInput,
  validateHawalaTransferField,
  validateHawalaTransferForm,
  type HawalaTransferFieldErrors,
  type HawalaTransferFormFields,
  type HawalaValidationError,
} from "@/lib/hawala/hawala-form-validation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-neutral-200 pt-7 first:border-t-0 first:pt-0">
      <h3 className="mb-5 text-sm font-semibold text-neutral-900">{title}</h3>
      {children}
    </section>
  );
}

const EMPTY_FORM: HawalaTransferFormFields = {
  senderName: "",
  senderPhone: "",
  senderEmail: "",
  senderCountry: "",
  senderAddress: "",
  senderBankName: "",
  senderAccountNumber: "",
  receiverName: "",
  receiverPhone: "",
  receiverCountry: "",
  receiverAddress: "",
  receiverBankName: "",
  receiverAccountNumber: "",
  sendAmount: "",
  sendCurrency: "USD",
  receiveCurrency: "AFN",
  note: "",
};

type HawalaExchangeRateRow = { currency: HawalaCurrency; rateToAfn: number };

type FieldLabelKey =
  | "senderName"
  | "senderPhone"
  | "senderEmail"
  | "senderCountry"
  | "senderAddress"
  | "senderBankName"
  | "senderAccountNumber"
  | "receiverName"
  | "receiverPhone"
  | "receiverCountry"
  | "receiverAddress"
  | "receiverBankName"
  | "receiverAccountNumber"
  | "sendAmount"
  | "note";

export function HawalaTransferForm() {
  const t = useTranslations("HawalaPages.form");
  const formRef = useRef<HTMLFormElement>(null);
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState<HawalaTransferFormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<HawalaTransferFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [transferNumber, setTransferNumber] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

  const translateError = (
    field: FieldLabelKey,
    error: HawalaValidationError | undefined
  ) => {
    if (!error) return undefined;
    const fieldLabel = t(`fields.${field}`);
    return t(`validation.${error.code}`, {
      field: fieldLabel,
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

  useEffect(() => {
    let mounted = true;
    const loadRates = async () => {
      setRatesLoading(true);
      try {
        const response = await fetch("/api/hawala/exchange-rates");
        const data = await parseApiResponse<HawalaExchangeRateRow[]>(response);
        if (!mounted) return;
        setRates(Object.fromEntries(data.map((rate) => [rate.currency, rate.rateToAfn])));
      } catch {
        if (mounted) setRates(null);
      } finally {
        if (mounted) setRatesLoading(false);
      }
    };
    void loadRates();
    return () => {
      mounted = false;
    };
  }, []);

  const conversion = useMemo(() => {
    if (!rates) return null;
    const amount = Number(form.sendAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    try {
      const amountMinor = Math.round(amount * 100);
      const receiveAmountMinor = convertHawalaAmountMinor(
        amountMinor,
        form.sendCurrency,
        form.receiveCurrency,
        rates
      );
      const rate = getHawalaExchangeRate(form.sendCurrency, form.receiveCurrency, rates);
      return { receiveAmount: receiveAmountMinor / 100, rate };
    } catch {
      return null;
    }
  }, [rates, form.sendAmount, form.sendCurrency, form.receiveCurrency]);

  const clearFieldError = (field: keyof HawalaTransferFormFields) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateField = <K extends keyof HawalaTransferFormFields>(
    field: K,
    value: HawalaTransferFormFields[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    clearFieldError(field);
  };

  const validateOnBlur = (field: keyof HawalaTransferFormFields) => {
    const error = validateHawalaTransferField(field, form[field]);
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
    const nextErrors = validateHawalaTransferForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(t("validationSummary"));
      scrollToFirstError();
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        senderName: form.senderName.trim(),
        senderPhone: form.senderPhone.trim(),
        senderEmail: form.senderEmail.trim() || undefined,
        senderCountry: form.senderCountry.trim(),
        senderAddress: form.senderAddress.trim(),
        senderBankName: form.senderBankName.trim(),
        senderAccountNumber: form.senderAccountNumber.trim(),
        receiverName: form.receiverName.trim(),
        receiverPhone: form.receiverPhone.trim(),
        receiverCountry: form.receiverCountry.trim(),
        receiverAddress: form.receiverAddress.trim(),
        receiverBankName: form.receiverBankName.trim(),
        receiverAccountNumber: form.receiverAccountNumber.trim(),
        sendAmount: Number(form.sendAmount),
        sendCurrency: form.sendCurrency,
        receiveCurrency: form.receiveCurrency,
        note: form.note.trim() || undefined,
      };

      const response =
        isAuthenticated && user?.role === "CUSTOMER"
          ? await fetchWithAuth("/api/hawala", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/hawala", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error?.message ?? t("submitFailed"));
        return;
      }

      setTransferNumber(data.data.transferNumber);
      setForm({
        ...EMPTY_FORM,
        senderName: form.senderName,
        senderEmail: form.senderEmail,
        senderPhone: form.senderPhone,
      });
      setErrors({});
    } catch {
      toast.error(t("submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (transferNumber) {
    return (
      <div className="border-t-2 border-emerald-500 bg-white px-5 py-8 sm:px-8">
        <div className="flex items-start gap-4">
          <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-neutral-900">{t("successTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{t("successBody")}</p>
            <p className="mt-4 text-sm text-neutral-900">
              <span className="font-semibold">{t("transferNumber")}:</span>{" "}
              <span className="font-mono">{transferNumber}</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isAuthenticated && user?.role === "CUSTOMER" ? (
                <Link
                  href="/account/hawala"
                  className="inline-flex min-h-11 items-center justify-center bg-[#0F3460] px-5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
                >
                  {t("trackInAccount")}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setTransferNumber(null)}
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
            {t("badge")}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{t("title")}</h2>
        </div>
        <p className="text-xs text-neutral-500">
          <span className="text-red-500">*</span> {t("required")}
        </p>
      </div>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-neutral-600">{t("subtitle")}</p>

      <div className="space-y-8">
        <FormSection title={t("sections.sender")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label={t("fields.senderName")}
              required
              error={translateError("senderName", errors.senderName)}
            >
              <input
                className={fieldClassName(translateError("senderName", errors.senderName))}
                value={form.senderName}
                onChange={(event) =>
                  updateField("senderName", sanitizeNameLikeInput(event.target.value))
                }
                onBlur={() => validateOnBlur("senderName")}
                autoComplete="name"
              />
            </FormField>
            <FormField
              label={t("fields.senderPhone")}
              required
              error={translateError("senderPhone", errors.senderPhone)}
            >
              <input
                className={fieldClassName(translateError("senderPhone", errors.senderPhone))}
                value={form.senderPhone}
                onChange={(event) =>
                  updateField("senderPhone", sanitizePhoneInput(event.target.value))
                }
                onBlur={() => validateOnBlur("senderPhone")}
                autoComplete="tel"
              />
            </FormField>
            <FormField
              label={t("fields.senderEmail")}
              error={translateError("senderEmail", errors.senderEmail)}
            >
              <input
                type="email"
                className={fieldClassName(translateError("senderEmail", errors.senderEmail))}
                value={form.senderEmail}
                onChange={(event) => updateField("senderEmail", event.target.value)}
                onBlur={() => validateOnBlur("senderEmail")}
                autoComplete="email"
              />
            </FormField>
            <FormField
              label={t("fields.senderCountry")}
              required
              error={translateError("senderCountry", errors.senderCountry)}
            >
              <input
                className={fieldClassName(translateError("senderCountry", errors.senderCountry))}
                value={form.senderCountry}
                onChange={(event) =>
                  updateField("senderCountry", sanitizeNameLikeInput(event.target.value))
                }
                onBlur={() => validateOnBlur("senderCountry")}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField
                label={t("fields.senderAddress")}
                required
                error={translateError("senderAddress", errors.senderAddress)}
              >
                <textarea
                  className={fieldClassName(
                    translateError("senderAddress", errors.senderAddress),
                    true
                  )}
                  value={form.senderAddress}
                  onChange={(event) => updateField("senderAddress", event.target.value)}
                  onBlur={() => validateOnBlur("senderAddress")}
                />
              </FormField>
            </div>
            <FormField
              label={t("fields.senderBankName")}
              required
              error={translateError("senderBankName", errors.senderBankName)}
            >
              <input
                className={fieldClassName(translateError("senderBankName", errors.senderBankName))}
                value={form.senderBankName}
                onChange={(event) => updateField("senderBankName", event.target.value)}
                onBlur={() => validateOnBlur("senderBankName")}
              />
            </FormField>
            <FormField
              label={t("fields.senderAccountNumber")}
              required
              error={translateError("senderAccountNumber", errors.senderAccountNumber)}
            >
              <input
                className={fieldClassName(
                  translateError("senderAccountNumber", errors.senderAccountNumber)
                )}
                value={form.senderAccountNumber}
                onChange={(event) =>
                  updateField(
                    "senderAccountNumber",
                    sanitizeAccountNumberInput(event.target.value)
                  )
                }
                onBlur={() => validateOnBlur("senderAccountNumber")}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title={t("sections.receiver")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label={t("fields.receiverName")}
              required
              error={translateError("receiverName", errors.receiverName)}
            >
              <input
                className={fieldClassName(translateError("receiverName", errors.receiverName))}
                value={form.receiverName}
                onChange={(event) =>
                  updateField("receiverName", sanitizeNameLikeInput(event.target.value))
                }
                onBlur={() => validateOnBlur("receiverName")}
              />
            </FormField>
            <FormField
              label={t("fields.receiverPhone")}
              required
              error={translateError("receiverPhone", errors.receiverPhone)}
            >
              <input
                className={fieldClassName(translateError("receiverPhone", errors.receiverPhone))}
                value={form.receiverPhone}
                onChange={(event) =>
                  updateField("receiverPhone", sanitizePhoneInput(event.target.value))
                }
                onBlur={() => validateOnBlur("receiverPhone")}
              />
            </FormField>
            <FormField
              label={t("fields.receiverCountry")}
              required
              error={translateError("receiverCountry", errors.receiverCountry)}
            >
              <input
                className={fieldClassName(
                  translateError("receiverCountry", errors.receiverCountry)
                )}
                value={form.receiverCountry}
                onChange={(event) =>
                  updateField("receiverCountry", sanitizeNameLikeInput(event.target.value))
                }
                onBlur={() => validateOnBlur("receiverCountry")}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField
                label={t("fields.receiverAddress")}
                required
                error={translateError("receiverAddress", errors.receiverAddress)}
              >
                <textarea
                  className={fieldClassName(
                    translateError("receiverAddress", errors.receiverAddress),
                    true
                  )}
                  value={form.receiverAddress}
                  onChange={(event) => updateField("receiverAddress", event.target.value)}
                  onBlur={() => validateOnBlur("receiverAddress")}
                />
              </FormField>
            </div>
            <FormField
              label={t("fields.receiverBankName")}
              required
              error={translateError("receiverBankName", errors.receiverBankName)}
            >
              <input
                className={fieldClassName(
                  translateError("receiverBankName", errors.receiverBankName)
                )}
                value={form.receiverBankName}
                onChange={(event) => updateField("receiverBankName", event.target.value)}
                onBlur={() => validateOnBlur("receiverBankName")}
              />
            </FormField>
            <FormField
              label={t("fields.receiverAccountNumber")}
              required
              error={translateError("receiverAccountNumber", errors.receiverAccountNumber)}
            >
              <input
                className={fieldClassName(
                  translateError("receiverAccountNumber", errors.receiverAccountNumber)
                )}
                value={form.receiverAccountNumber}
                onChange={(event) =>
                  updateField(
                    "receiverAccountNumber",
                    sanitizeAccountNumberInput(event.target.value)
                  )
                }
                onBlur={() => validateOnBlur("receiverAccountNumber")}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title={t("sections.amount")}>
          <div className="grid gap-5 sm:grid-cols-3">
            <FormField
              label={t("fields.sendAmount")}
              required
              error={translateError("sendAmount", errors.sendAmount)}
            >
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className={fieldClassName(translateError("sendAmount", errors.sendAmount))}
                value={form.sendAmount}
                onChange={(event) => updateField("sendAmount", event.target.value)}
                onBlur={() => validateOnBlur("sendAmount")}
              />
            </FormField>
            <FormField label={t("fields.sendCurrency")}>
              <select
                className={fieldClassName()}
                value={form.sendCurrency}
                onChange={(event) =>
                  updateField("sendCurrency", event.target.value as HawalaCurrency)
                }
              >
                {HAWALA_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {HAWALA_CURRENCY_LABELS[currency]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("fields.receiveCurrency")}>
              <select
                className={fieldClassName()}
                value={form.receiveCurrency}
                onChange={(event) =>
                  updateField("receiveCurrency", event.target.value as HawalaCurrency)
                }
              >
                {HAWALA_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {HAWALA_CURRENCY_LABELS[currency]}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 border-t border-neutral-200 pt-5">
            {ratesLoading ? (
              <p className="flex items-center gap-2 text-sm text-neutral-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("rateLoading")}
              </p>
            ) : conversion ? (
              <>
                <p className="text-sm text-neutral-700">
                  {t("receiverGets")}{" "}
                  <span className="text-2xl font-bold tracking-tight text-[#0F3460]">
                    {conversion.receiveAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {form.receiveCurrency}
                  </span>
                </p>
                <p className="text-xs text-neutral-500">
                  {t("exchangeRateLabel")}: 1 {form.sendCurrency} ≈{" "}
                  {conversion.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                  {form.receiveCurrency}
                </p>
              </>
            ) : (
              <p className="text-sm text-neutral-500">{t("rateUnavailable")}</p>
            )}
          </div>
        </FormSection>

        <FormSection title={t("sections.note")}>
          <FormField label={t("fields.note")} error={translateError("note", errors.note)}>
            <textarea
              className={fieldClassName(translateError("note", errors.note), true)}
              value={form.note}
              onChange={(event) => updateField("note", event.target.value)}
              onBlur={() => validateOnBlur("note")}
              placeholder={t("notePlaceholder")}
            />
          </FormField>
        </FormSection>
      </div>

      <div className="mt-10 border-t border-neutral-200 pt-6">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 bg-[#0F3460] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
