"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  Banknote,
  CheckCircle,
  Landmark,
  Loader2,
  MapPin,
  Send,
  User,
} from "lucide-react";

import { getHawalaCopy } from "@/components/hawala/copy";
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
} from "@/lib/hawala/hawala-form-validation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { toast } from "@/lib/utils/toast";
import { useAuth } from "@/store/auth-context";

const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-neutral-700";
const ERROR_CLASS = "mt-1.5 text-xs text-red-600";

function fieldClassName(error?: string, multiline = false) {
  return `w-full rounded-xl border px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 ${
    multiline ? "min-h-[100px] resize-y" : ""
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

type HawalaTransferFormProps = {
  locale: SupportedLocale;
};

export function HawalaTransferForm({ locale }: HawalaTransferFormProps) {
  const copy = getHawalaCopy(locale);
  const formRef = useRef<HTMLFormElement>(null);
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState<HawalaTransferFormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<HawalaTransferFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [transferNumber, setTransferNumber] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesLoading, setRatesLoading] = useState(true);

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
      toast.error(copy.validationSummary);
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
        toast.error(data?.error?.message ?? copy.submitFailed);
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
      toast.error(copy.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  if (transferNumber) {
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
              <span className="font-semibold">{copy.transferNumber}:</span>{" "}
              <span className="font-mono">{transferNumber}</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {isAuthenticated && user?.role === "CUSTOMER" ? (
                <Link
                  href="/account/hawala"
                  className="inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  {copy.trackInAccount}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setTransferNumber(null)}
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
          <Banknote className="h-3.5 w-3.5" />
          {copy.formBadge}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">{copy.formTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{copy.formSubtitle}</p>
        <p className="mt-2 text-xs text-neutral-500">
          <span className="text-red-500">*</span> {copy.required}
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="mb-4 flex items-center gap-2 text-[#0f3460]">
            <User className="h-4 w-4" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">
              {copy.senderSection}
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={copy.senderName} required error={errors.senderName}>
              <input
                className={fieldClassName(errors.senderName)}
                value={form.senderName}
                onChange={(event) =>
                  updateField("senderName", sanitizeNameLikeInput(event.target.value))
                }
                onBlur={() => validateOnBlur("senderName")}
                autoComplete="name"
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
              />
            </FormField>
            <FormField label={copy.senderEmail} error={errors.senderEmail}>
              <input
                type="email"
                className={fieldClassName(errors.senderEmail)}
                value={form.senderEmail}
                onChange={(event) => updateField("senderEmail", event.target.value)}
                onBlur={() => validateOnBlur("senderEmail")}
                autoComplete="email"
              />
            </FormField>
            <FormField label={copy.senderCountry} required error={errors.senderCountry}>
              <input
                className={fieldClassName(errors.senderCountry)}
                value={form.senderCountry}
                onChange={(event) =>
                  updateField("senderCountry", sanitizeNameLikeInput(event.target.value))
                }
                onBlur={() => validateOnBlur("senderCountry")}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label={copy.senderAddress} required error={errors.senderAddress}>
                <textarea
                  className={fieldClassName(errors.senderAddress, true)}
                  value={form.senderAddress}
                  onChange={(event) => updateField("senderAddress", event.target.value)}
                  onBlur={() => validateOnBlur("senderAddress")}
                />
              </FormField>
            </div>
            <FormField label={copy.senderBankName} required error={errors.senderBankName}>
              <input
                className={fieldClassName(errors.senderBankName)}
                value={form.senderBankName}
                onChange={(event) => updateField("senderBankName", event.target.value)}
                onBlur={() => validateOnBlur("senderBankName")}
              />
            </FormField>
            <FormField
              label={copy.senderAccountNumber}
              required
              error={errors.senderAccountNumber}
            >
              <input
                className={fieldClassName(errors.senderAccountNumber)}
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
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2 text-[#0f3460]">
            <MapPin className="h-4 w-4" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">
              {copy.receiverSection}
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={copy.receiverName} required error={errors.receiverName}>
              <input
                className={fieldClassName(errors.receiverName)}
                value={form.receiverName}
                onChange={(event) =>
                  updateField("receiverName", sanitizeNameLikeInput(event.target.value))
                }
                onBlur={() => validateOnBlur("receiverName")}
              />
            </FormField>
            <FormField label={copy.receiverPhone} required error={errors.receiverPhone}>
              <input
                className={fieldClassName(errors.receiverPhone)}
                value={form.receiverPhone}
                onChange={(event) =>
                  updateField("receiverPhone", sanitizePhoneInput(event.target.value))
                }
                onBlur={() => validateOnBlur("receiverPhone")}
              />
            </FormField>
            <FormField label={copy.receiverCountry} required error={errors.receiverCountry}>
              <input
                className={fieldClassName(errors.receiverCountry)}
                value={form.receiverCountry}
                onChange={(event) =>
                  updateField("receiverCountry", sanitizeNameLikeInput(event.target.value))
                }
                onBlur={() => validateOnBlur("receiverCountry")}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label={copy.receiverAddress} required error={errors.receiverAddress}>
                <textarea
                  className={fieldClassName(errors.receiverAddress, true)}
                  value={form.receiverAddress}
                  onChange={(event) => updateField("receiverAddress", event.target.value)}
                  onBlur={() => validateOnBlur("receiverAddress")}
                />
              </FormField>
            </div>
            <FormField label={copy.receiverBankName} required error={errors.receiverBankName}>
              <input
                className={fieldClassName(errors.receiverBankName)}
                value={form.receiverBankName}
                onChange={(event) => updateField("receiverBankName", event.target.value)}
                onBlur={() => validateOnBlur("receiverBankName")}
              />
            </FormField>
            <FormField
              label={copy.receiverAccountNumber}
              required
              error={errors.receiverAccountNumber}
            >
              <input
                className={fieldClassName(errors.receiverAccountNumber)}
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
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2 text-[#0f3460]">
            <Landmark className="h-4 w-4" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">
              {copy.amountSection}
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={copy.sendAmount} required error={errors.sendAmount}>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className={fieldClassName(errors.sendAmount)}
                value={form.sendAmount}
                onChange={(event) => updateField("sendAmount", event.target.value)}
                onBlur={() => validateOnBlur("sendAmount")}
              />
            </FormField>
            <FormField label={copy.sendCurrency}>
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
            <FormField label={copy.receiveCurrency}>
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

          <div className="mt-4 rounded-xl border border-[#0f3460]/15 bg-[#0f3460]/5 px-4 py-3.5">
            {ratesLoading ? (
              <p className="flex items-center gap-2 text-sm text-neutral-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.rateLoading}
              </p>
            ) : conversion ? (
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-neutral-700">
                  {copy.receiverGets}{" "}
                  <span className="text-lg font-bold text-[#0f3460]">
                    {conversion.receiveAmount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {form.receiveCurrency}
                  </span>
                </p>
                <p className="text-xs text-neutral-500">
                  {copy.exchangeRateLabel}: 1 {form.sendCurrency} ≈{" "}
                  {conversion.rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                  {form.receiveCurrency}
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">{copy.rateUnavailable}</p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#0f3460]">
              {copy.noteSection}
            </h3>
          </div>
          <FormField label={copy.note} error={errors.note}>
            <textarea
              className={fieldClassName(errors.note, true)}
              value={form.note}
              onChange={(event) => updateField("note", event.target.value)}
              onBlur={() => validateOnBlur("note")}
              placeholder={copy.notePlaceholder}
            />
          </FormField>
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
