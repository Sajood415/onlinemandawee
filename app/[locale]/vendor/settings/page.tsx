"use client";

import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CreditCard,
  ImageIcon,
  Landmark,
  Loader2,
  MapPin,
  Upload,
} from "lucide-react";

import { AddressAutocompleteInput } from "@/components/address/AddressAutocompleteInput";
import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { VendorPortalOverlay } from "@/components/vendor/VendorPortalOverlay";
import { industryTypes } from "@/domain/vendor/vendor-types";
import type { IndustryType } from "@/domain/vendor/vendor-types";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { getStripePromise } from "@/lib/stripe/client";
import { toast } from "@/lib/utils/toast";
import { invalidateVendorStoreNameCache } from "@/lib/vendor/store-name-cache";

type VendorAddress = {
  addressLine1: string;
  city: string;
  country: string;
  postalCode: string;
};

type VendorProfile = {
  storeName: string;
  storeSlug: string;
  businessType: "INDIVIDUAL" | "REGISTERED_BUSINESS" | null;
  industryType: IndustryType | null;
  logoUrl: string;
  description: string;
  address: VendorAddress | null;
  user: { fullName: string; email: string; phone: string };
  payoutMethod: {
    method: "BANK";
    accountName: string;
    accountNumberOrIban: string;
    bankName: string;
  } | null;
};

type VendorSubscriptionStatus = {
  status: "TRIAL" | "ACTIVE" | "FAILED" | "SUSPENDED";
  monthlyAmount: number;
  currency: string;
  trialEndsAt: string | null;
  isInTrial: boolean;
  overdueMonths: number;
  overdueDays: number;
  alertLevel: "none" | "warning" | "critical" | "suspended";
  shopSuspendedForBilling: boolean;
  gracePeriodEndsAt: string | null;
  failedPaymentCount: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  defaultPaymentMethodAttached: boolean;
  nextBillingAt: string | null;
  lastPaymentAt: string | null;
};

type SetupIntentResponse = {
  customerId: string;
  clientSecret: string | null;
  setupIntentId: string;
  publishableKey: string | null;
};

const stripePromise = getStripePromise();

const CONTROL =
  "w-full min-h-11 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm leading-snug text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const LABEL =
  "block text-xs font-medium text-neutral-600";
const FIELD = "flex flex-col gap-1.5";

type Tab = "business" | "payout";

function RequiredMark({ title }: { title: string }) {
  return (
    <abbr
      className="ms-0.5 font-semibold text-red-500 no-underline"
      title={title}
    >
      *
    </abbr>
  );
}

function SaveButton({
  saving,
  label,
  savingLabel,
}: {
  saving: boolean;
  label: string;
  savingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {saving ? savingLabel : label}
    </button>
  );
}

function formatCurrency(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateLong(iso: string | null, locale: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const startToday = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startEnd = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );
  return Math.round((startEnd - startToday) / (24 * 60 * 60 * 1000));
}

function MembershipPanel({
  status,
  loading,
  locale,
  attachingCard,
  billingLoading,
  onAddCard,
  onManageBilling,
}: {
  status: VendorSubscriptionStatus | null;
  loading: boolean;
  locale: string;
  attachingCard: boolean;
  billingLoading: boolean;
  onAddCard: () => void;
  onManageBilling: () => void;
}) {
  const t = useTranslations("VendorPages.settings.billing");
  const isTrial = status?.status === "TRIAL";
  const hasCard = Boolean(status?.defaultPaymentMethodAttached);
  const fee = status
    ? formatCurrency(status.monthlyAmount, status.currency, locale)
    : "—";
  const remaining = isTrial ? daysUntil(status?.trialEndsAt ?? null) : null;

  const tone =
    status?.status === "FAILED" || status?.status === "SUSPENDED"
      ? "border-red-200 bg-red-50/80"
      : isTrial
        ? "border-primary/20 bg-gradient-to-br from-primary/10 via-white to-white"
        : "border-neutral-200 bg-white";

  return (
    <section className={`overflow-hidden rounded-2xl border ${tone}`}>
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900">
              {t("title")}
            </span>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
            ) : status ? (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  status.status === "TRIAL"
                    ? "bg-primary/10 text-primary"
                    : status.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {t(`statuses.${status.status}`)}
              </span>
            ) : null}
          </div>

          {loading && !status ? (
            <div className="mt-5 h-20 animate-pulse rounded-xl bg-neutral-100" />
          ) : isTrial ? (
            <div className="mt-4">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {t("freeUntil")}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
                {formatDateLong(status?.trialEndsAt ?? null, locale)}
              </p>
              {remaining != null ? (
                <p className="mt-1.5 text-sm font-medium text-primary">
                  {remaining < 0
                    ? t("trialEnded")
                    : t("daysLeft", { count: remaining })}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-neutral-600">
                {t("afterTrial", { fee })}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {hasCard ? t("cardReady") : t("cardNeeded")}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-1.5 text-sm text-neutral-700">
              <p>
                {t("nextBilling")}:{" "}
                <span className="font-semibold text-neutral-900">
                  {formatDate(status?.nextBillingAt ?? null, locale)}
                </span>
              </p>
              <p>
                {t("monthlyFee")}:{" "}
                <span className="font-semibold text-neutral-900">{fee}</span>
              </p>
              <p>
                {hasCard ? t("cardAttached") : t("cardMissing")}
              </p>
              {status && status.failedPaymentCount > 0 ? (
                <p className="font-medium text-red-700">
                  {t("failedCount")}: {status.failedPaymentCount}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-2 sm:flex-row lg:flex-col lg:items-stretch">
          <button
            type="button"
            onClick={onAddCard}
            disabled={attachingCard || loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            {attachingCard
              ? t("starting")
              : hasCard
                ? t("update")
                : t("attach")}
          </button>
          <button
            type="button"
            onClick={onManageBilling}
            disabled={billingLoading || loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            {billingLoading ? t("opening") : t("manage")}
          </button>
        </div>
      </div>
    </section>
  );
}

function CardSetupForm({
  clientSecret,
  setupIntentId,
  token,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  setupIntentId: string;
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("VendorPages.settings.billing");
  const tRoot = useTranslations("VendorPages.settings");
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  const saveCard = async () => {
    if (!stripe || !elements) {
      toast.error(t("cardSaveError"), t("stripeNotReady"));
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error(t("cardSaveError"), t("cardUnavailable"));
      return;
    }

    setSaving(true);
    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (error) {
        throw new Error(error.message || t("cardSaveError"));
      }
      if (!setupIntent || setupIntent.status !== "succeeded") {
        throw new Error(t("cardSaveError"));
      }

      const response = await fetch("/api/vendor/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "finalize_setup_intent",
          setupIntentId: setupIntent.id || setupIntentId,
        }),
      });
      await parseApiResponse(response);
      toast.success(t("cardSaved"), t("cardSavedBody"));
      onSuccess();
    } catch (error) {
      toast.error(
        t("cardSaveError"),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <VendorPortalOverlay open>
      <div
        className="fixed inset-0 z-[100] flex min-h-[100dvh] w-screen items-center justify-center bg-black/50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onCancel();
        }}
      >
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6">
          <h3 className="text-lg font-semibold text-neutral-900">
            {t("modalTitle")}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">{t("modalHelp")}</p>
          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: "14px",
                  },
                },
              }}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-60"
            >
              {t("modalCancel")}
            </button>
            <button
              type="button"
              onClick={() => void saveCard()}
              disabled={saving || !stripe}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? tRoot("saving") : t("modalSave")}
            </button>
          </div>
        </div>
      </div>
    </VendorPortalOverlay>
  );
}

function BusinessInfoTab({
  profile,
  token,
  onSaved,
}: {
  profile: VendorProfile;
  token: string;
  onSaved: (updated: Partial<VendorProfile>) => void;
}) {
  const t = useTranslations("VendorPages.settings");
  const tIndustry = useTranslations(
    "VendorPages.register.wizard.store.industryTypes"
  );
  const [storeName, setStoreName] = useState(profile.storeName);
  const [businessType, setBusinessType] = useState<
    "INDIVIDUAL" | "REGISTERED_BUSINESS"
  >(profile.businessType ?? "INDIVIDUAL");
  const [industryType, setIndustryType] = useState<IndustryType | "">(
    profile.industryType ?? ""
  );
  const [description, setDescription] = useState(profile.description);
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    profile.logoUrl || null
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addressLine1, setAddressLine1] = useState(
    profile.address?.addressLine1 ?? ""
  );
  const [city, setCity] = useState(profile.address?.city ?? "");
  const [country, setCountry] = useState(profile.address?.country ?? "");
  const [postalCode, setPostalCode] = useState(
    profile.address?.postalCode ?? ""
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const descLen = description.trim().length;
  const descOver = descLen > 500;

  const handleLogoSelect = (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      toast.error(t("store.saveError"), t("store.nameRequired"));
      return;
    }
    if (descOver) {
      toast.error(t("store.saveError"), t("store.descTooLong"));
      return;
    }
    if (
      !addressLine1.trim() ||
      !city.trim() ||
      !country.trim() ||
      !postalCode.trim()
    ) {
      toast.error(t("store.saveError"), t("store.addressRequired"));
      return;
    }

    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      if (logoFile) {
        setUploadingLogo(true);
        const fd = new FormData();
        fd.set("file", logoFile);
        const uploadRes = await fetch("/api/vendor/profile/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const uploadData = await parseApiResponse<{ url: string }>(uploadRes);
        finalLogoUrl = uploadData.url;
        setLogoUrl(finalLogoUrl);
        setLogoFile(null);
        setUploadingLogo(false);
      }

      const body: Record<string, unknown> = {
        storeName: storeName.trim(),
        businessType,
        ...(industryType ? { industryType } : {}),
        ...(finalLogoUrl ? { logoUrl: finalLogoUrl } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      };

      const [businessRes, addressRes] = await Promise.all([
        fetch("/api/vendor/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }),
        fetch("/api/vendor/profile/address", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            addressLine1: addressLine1.trim(),
            city: city.trim(),
            country: country.trim(),
            postalCode: postalCode.trim(),
          }),
        }),
      ]);

      const data = await parseApiResponse<Partial<VendorProfile>>(businessRes);
      const addressData = await parseApiResponse<VendorAddress>(addressRes);
      invalidateVendorStoreNameCache();
      onSaved({ ...data, address: addressData });
      toast.success(t("store.saved"));
    } catch (error) {
      toast.error(
        t("store.saveError"),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {t("account.title")}
        </p>
        <p className="mt-1 text-sm text-neutral-500">{t("account.help")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: t("account.fullName"), value: profile.user.fullName },
            { label: t("account.email"), value: profile.user.email },
            { label: t("account.phone"), value: profile.user.phone },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-neutral-100 bg-neutral-50/80 px-3.5 py-3"
            >
              <p className="text-xs text-neutral-500">{label}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-neutral-800">
                {value || "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              {t("store.title")}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">{t("store.help")}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-5">
          <div className={FIELD}>
            <span className={LABEL}>{t("store.logo")}</span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt={t("store.logoAlt")}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-neutral-300" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo || saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingLogo
                    ? t("store.uploading")
                    : logoFile
                      ? logoFile.name
                      : t("store.changeLogo")}
                </button>
                <p className="text-xs text-neutral-400">{t("store.logoHint")}</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoSelect(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`${FIELD} sm:col-span-2`}>
              <label htmlFor="store-name" className={LABEL}>
                {t("store.storeName")} <RequiredMark title={t("required")} />
              </label>
              <input
                id="store-name"
                className={CONTROL}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                maxLength={120}
                placeholder={t("store.storeNamePlaceholder")}
              />
            </div>

            <div className={FIELD}>
              <label htmlFor="business-type" className={LABEL}>
                {t("store.businessType")} <RequiredMark title={t("required")} />
              </label>
              <select
                id="business-type"
                className={CONTROL}
                value={businessType}
                onChange={(e) =>
                  setBusinessType(
                    e.target.value as "INDIVIDUAL" | "REGISTERED_BUSINESS"
                  )
                }
              >
                <option value="INDIVIDUAL">{t("store.individual")}</option>
                <option value="REGISTERED_BUSINESS">
                  {t("store.registered")}
                </option>
              </select>
            </div>

            <div className={FIELD}>
              <label htmlFor="industry-type" className={LABEL}>
                {t("store.industry")}
                <span className="ms-1 font-normal text-neutral-400">
                  ({t("optional")})
                </span>
              </label>
              <select
                id="industry-type"
                className={CONTROL}
                value={industryType}
                onChange={(e) =>
                  setIndustryType(e.target.value as IndustryType | "")
                }
              >
                <option value="">{t("store.selectIndustry")}</option>
                {industryTypes.map((type) => (
                  <option key={type} value={type}>
                    {tIndustry(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={FIELD}>
            <label htmlFor="store-desc" className={LABEL}>
              {t("store.description")}
              <span className="ms-1 font-normal text-neutral-400">
                ({t("optional")})
              </span>
            </label>
            <textarea
              id="store-desc"
              rows={4}
              className={`${CONTROL} resize-y ${
                descOver
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : ""
              }`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("store.descriptionPlaceholder")}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-neutral-400">
                {t("store.descriptionMax")}
              </p>
              <p
                className={`text-xs tabular-nums ${
                  descOver
                    ? "font-semibold text-red-600"
                    : "text-neutral-400"
                }`}
              >
                {descLen} / 500
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              {t("address.title")}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">{t("address.help")}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {!profile.address ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("address.requiredBanner")}
            </div>
          ) : null}

          <div className={FIELD}>
            <label htmlFor="store-address-line1" className={LABEL}>
              {t("address.street")} <RequiredMark title={t("required")} />
            </label>
            <AddressAutocompleteInput
              id="store-address-line1"
              className={CONTROL}
              value={addressLine1}
              placeholder={t("address.streetPlaceholder")}
              maxLength={255}
              onTextChange={setAddressLine1}
              onPlaceSelect={(place) => {
                setAddressLine1(place.addressLine1);
                if (place.city) setCity(place.city);
                if (place.country) setCountry(place.country);
                if (place.postalCode) setPostalCode(place.postalCode);
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className={FIELD}>
              <label htmlFor="store-city" className={LABEL}>
                {t("address.city")} <RequiredMark title={t("required")} />
              </label>
              <input
                id="store-city"
                className={CONTROL}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("address.cityPlaceholder")}
                maxLength={120}
              />
            </div>
            <div className={FIELD}>
              <label htmlFor="store-postal-code" className={LABEL}>
                {t("address.postal")} <RequiredMark title={t("required")} />
              </label>
              <input
                id="store-postal-code"
                className={CONTROL}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder={t("address.postalPlaceholder")}
                maxLength={40}
              />
            </div>
          </div>

          <div className={FIELD}>
            <label htmlFor="store-country" className={LABEL}>
              {t("address.country")} <RequiredMark title={t("required")} />
            </label>
            <input
              id="store-country"
              className={CONTROL}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t("address.countryPlaceholder")}
              maxLength={120}
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-neutral-100 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-neutral-400 sm:block">
            {t("saveHint")}
          </p>
          <SaveButton
            saving={saving}
            label={t("store.save")}
            savingLabel={t("saving")}
          />
        </div>
      </div>
    </form>
  );
}

function PayoutDetailsTab({
  profile,
  token,
  onPayoutSaved,
}: {
  profile: VendorProfile;
  token: string;
  onPayoutSaved?: () => void;
}) {
  const t = useTranslations("VendorPages.settings");
  const pm = profile.payoutMethod;
  const [accountName, setAccountName] = useState(pm?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(
    pm?.accountNumberOrIban ?? ""
  );
  const [bankName, setBankName] = useState(pm?.bankName ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = profile.payoutMethod;
    setAccountName(next?.accountName ?? "");
    setAccountNumber(next?.accountNumberOrIban ?? "");
    setBankName(next?.bankName ?? "");
  }, [
    profile.payoutMethod?.accountName,
    profile.payoutMethod?.accountNumberOrIban,
    profile.payoutMethod?.bankName,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountName.trim()) {
      toast.error(t("payout.saveError"), t("payout.nameRequired"));
      return;
    }
    if (!accountNumber.trim()) {
      toast.error(t("payout.saveError"), t("payout.numberRequired"));
      return;
    }
    if (!bankName.trim()) {
      toast.error(t("payout.saveError"), t("payout.bankRequired"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/vendor/profile/payout", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: "BANK",
          accountName: accountName.trim(),
          accountNumberOrIban: accountNumber.trim(),
          bankName: bankName.trim(),
        }),
      });
      await parseApiResponse(res);
      toast.success(t("payout.saved"));
      onPayoutSaved?.();
    } catch (error) {
      toast.error(
        t("payout.saveError"),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Landmark className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              {t("payout.title")}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">{t("payout.help")}</p>
          </div>
        </div>

        <div className="mt-6 flex max-w-xl flex-col gap-4">
          <div className={FIELD}>
            <label htmlFor="account-name" className={LABEL}>
              {t("payout.accountName")}
            </label>
            <input
              id="account-name"
              className={CONTROL}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={t("payout.accountNamePlaceholder")}
            />
          </div>
          <div className={FIELD}>
            <label htmlFor="account-number" className={LABEL}>
              {t("payout.accountNumber")}
            </label>
            <input
              id="account-number"
              className={CONTROL}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={t("payout.accountNumberPlaceholder")}
            />
          </div>
          <div className={FIELD}>
            <label htmlFor="bank-name" className={LABEL}>
              {t("payout.bankName")}
            </label>
            <input
              id="bank-name"
              className={CONTROL}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder={t("payout.bankNamePlaceholder")}
            />
          </div>
          <p className="text-sm leading-relaxed text-neutral-500">
            {t("payout.note")}
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-neutral-100 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-neutral-400 sm:block">
            {t("saveHint")}
          </p>
          <SaveButton
            saving={saving}
            label={t("payout.save")}
            savingLabel={t("saving")}
          />
        </div>
      </div>
    </form>
  );
}

export default function VendorSettingsPage() {
  const t = useTranslations("VendorPages.settings");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("VENDOR");
  const [tab, setTab] = useState<Tab>("business");
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [attachingCard, setAttachingCard] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<VendorSubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [cardSetup, setCardSetup] = useState<{
    clientSecret: string;
    setupIntentId: string;
  } | null>(null);

  const fetchProfile = useCallback(
    async (opts?: { silent?: boolean }) => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) return;
      if (!opts?.silent) {
        setDataLoading(true);
      }
      setError(null);
      try {
        const res = await fetch("/api/vendor/profile", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await parseApiResponse<VendorProfile>(res);
        setProfile(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("loadError"));
      } finally {
        if (!opts?.silent) {
          setDataLoading(false);
        }
      }
    },
    [t]
  );

  const token =
    typeof window !== "undefined"
      ? (localStorage.getItem("accessToken") ?? "")
      : "";

  const loadSubscriptionStatus = useCallback(async () => {
    if (!token) return;
    setSubscriptionLoading(true);
    try {
      const response = await fetch("/api/vendor/subscription", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await parseApiResponse<VendorSubscriptionStatus>(response);
      setSubscriptionStatus(data);
    } catch (e) {
      toast.error(
        t("billing.loadError"),
        e instanceof Error ? e.message : undefined
      );
      setSubscriptionStatus(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [t, token]);

  const startCardAttach = useCallback(async () => {
    if (!token) {
      toast.error(t("billing.sessionMissing"), t("billing.sessionMissingBody"));
      return;
    }
    if (!stripePromise) {
      toast.error(t("billing.stripeMissing"), t("billing.stripeMissingBody"));
      return;
    }

    setAttachingCard(true);
    try {
      const response = await fetch("/api/vendor/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "create_setup_intent",
        }),
      });
      const data = await parseApiResponse<SetupIntentResponse>(response);
      if (!data.clientSecret) {
        throw new Error(t("billing.cardStartError"));
      }
      setCardSetup({
        clientSecret: data.clientSecret,
        setupIntentId: data.setupIntentId,
      });
    } catch (e) {
      toast.error(
        t("billing.cardStartError"),
        e instanceof Error ? e.message : undefined
      );
    } finally {
      setAttachingCard(false);
    }
  }, [t, token]);

  const openBillingPortal = useCallback(async () => {
    if (!token) {
      toast.error(t("billing.sessionMissing"), t("billing.sessionMissingBody"));
      return;
    }
    setBillingLoading(true);
    try {
      const response = await fetch("/api/vendor/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "create_portal_session",
          returnUrl: window.location.href,
        }),
      });
      const data = await parseApiResponse<{ url: string }>(response);
      window.location.href = data.url;
    } catch (e) {
      toast.error(
        t("billing.portalError"),
        e instanceof Error ? e.message : undefined
      );
    } finally {
      setBillingLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    if (!authLoading && user) void fetchProfile();
  }, [authLoading, user, fetchProfile]);

  useEffect(() => {
    if (!authLoading && user) void loadSubscriptionStatus();
  }, [authLoading, user, loadSubscriptionStatus]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "business",
      label: t("tabs.business"),
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: "payout",
      label: t("tabs.payout"),
      icon: <Landmark className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-5 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">{t("subtitle")}</p>
      </div>

      <MembershipPanel
        status={subscriptionStatus}
        loading={subscriptionLoading}
        locale={locale}
        attachingCard={attachingCard}
        billingLoading={billingLoading}
        onAddCard={() => void startCardAttach()}
        onManageBilling={() => void openBillingPortal()}
      />

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => void fetchProfile()}
            className="font-medium underline"
          >
            {t("tryAgain")}
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div
          role="tablist"
          aria-label={t("title")}
          className="flex gap-0 overflow-x-auto border-b border-neutral-200"
        >
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition sm:px-6 ${
                  active
                    ? "text-primary"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                }`}
              >
                {item.icon}
                {item.label}
                {active ? (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary sm:inset-x-4" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-5 sm:px-5">
          {dataLoading || !profile ? (
            <div className="flex min-h-[24vh] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-neutral-400" />
            </div>
          ) : tab === "business" ? (
            <BusinessInfoTab
              profile={profile}
              token={token}
              onSaved={(updated) =>
                setProfile((prev) => (prev ? { ...prev, ...updated } : prev))
              }
            />
          ) : (
            <PayoutDetailsTab
              profile={profile}
              token={token}
              onPayoutSaved={() => void fetchProfile({ silent: true })}
            />
          )}
        </div>
      </div>

      {cardSetup ? (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret: cardSetup.clientSecret }}
        >
          <CardSetupForm
            clientSecret={cardSetup.clientSecret}
            setupIntentId={cardSetup.setupIntentId}
            token={token}
            onCancel={() => setCardSetup(null)}
            onSuccess={() => {
              setCardSetup(null);
              void loadSubscriptionStatus();
            }}
          />
        </Elements>
      ) : null}
    </div>
  );
}
