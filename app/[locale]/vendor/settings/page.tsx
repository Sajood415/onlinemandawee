"use client";

import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe/client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  CreditCard,
  Loader2,
  Upload,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  User,
  Landmark,
  MapPin,
} from "lucide-react";

import { AddressAutocompleteInput } from "@/components/address/AddressAutocompleteInput";
import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { invalidateVendorStoreNameCache } from "@/lib/vendor/store-name-cache";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
import { industryTypes, industryTypeLabels } from "@/domain/vendor/vendor-types";
import type { IndustryType } from "@/domain/vendor/vendor-types";

/* ─── types ──────────────────────────────────────────────────────────── */

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

/* ─── style constants ────────────────────────────────────────────────── */

const CONTROL =
  "w-full min-h-11 rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm leading-snug text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";
const LABEL = "block text-[11px] font-semibold uppercase tracking-wider text-neutral-600";
const FIELD = "flex flex-col gap-2";
const SECTION = "rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8";
const SECTION_TITLE = "text-base font-semibold text-neutral-900";
const SECTION_LEAD = "mt-1 text-sm leading-relaxed text-neutral-500";

/* ─── sub-components ─────────────────────────────────────────────────── */

function RequiredMark() {
  return (
    <abbr className="ml-0.5 font-semibold text-red-500 no-underline" title="Required">*</abbr>
  );
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
    >
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {saving ? "Saving…" : label}
    </button>
  );
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
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
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  const saveCard = async () => {
    if (!stripe || !elements) {
      toast.error("Stripe not ready", "Please wait a second and try again.");
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error("Card form unavailable", "Please refresh and try again.");
      return;
    }

    setSaving(true);
    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to save card");
      }
      if (!setupIntent || setupIntent.status !== "succeeded") {
        throw new Error("Card setup did not complete");
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
      toast.success("Card saved", "Your subscription billing card is updated.");
      onSuccess();
    } catch (error) {
      toast.error(
        "Could not save card",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-neutral-900">Save billing card</h3>
        <p className="mt-1 text-sm text-neutral-600">
          This card will be used for automatic membership charges.
        </p>
        <div className="mt-4 rounded-lg border border-neutral-300 bg-white p-3">
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
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveCard()}
            disabled={saving || !stripe}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save card"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── tabs ─────────────────────────────────────────────────────────── */

type Tab = "business" | "payout";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "business", label: "Business Info", icon: <Building2 className="h-4 w-4" /> },
  { id: "payout", label: "Bank Details", icon: <CreditCard className="h-4 w-4" /> },
];

/* ─── Business Info tab ─────────────────────────────────────────────── */

function BusinessInfoTab({
  profile,
  token,
  onSaved,
}: {
  profile: VendorProfile;
  token: string;
  onSaved: (updated: Partial<VendorProfile>) => void;
}) {
  const [storeName, setStoreName] = useState(profile.storeName);
  const [businessType, setBusinessType] = useState<"INDIVIDUAL" | "REGISTERED_BUSINESS">(
    profile.businessType ?? "INDIVIDUAL"
  );
  const [industryType, setIndustryType] = useState<IndustryType | "">(
    profile.industryType ?? ""
  );
  const [description, setDescription] = useState(profile.description);
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(profile.logoUrl || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addressLine1, setAddressLine1] = useState(profile.address?.addressLine1 ?? "");
  const [city, setCity] = useState(profile.address?.city ?? "");
  const [country, setCountry] = useState(profile.address?.country ?? "");
  const [postalCode, setPostalCode] = useState(profile.address?.postalCode ?? "");
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
      toast.error("Store name", "Store name is required.");
      return;
    }
    if (descOver) {
      toast.error("Description too long", "Keep description under 500 characters.");
      return;
    }
    if (
      !addressLine1.trim() ||
      !city.trim() ||
      !country.trim() ||
      !postalCode.trim()
    ) {
      toast.error("Store address", "Fill in your full pickup address so delivery can be calculated.");
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
      toast.success("Saved", "Business info and store address updated.");
    } catch (e) {
      toast.error("Could not save", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-8">
      {/* Account info (read-only) */}
      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>
          <User className="mr-2 inline h-4 w-4 text-neutral-400" />
          Account details
        </h2>
        <p className={SECTION_LEAD}>Your login credentials. Contact support to change email or phone.</p>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            { label: "Full name", value: profile.user.fullName },
            { label: "Email", value: profile.user.email },
            { label: "Phone", value: profile.user.phone },
          ].map(({ label, value }) => (
            <div key={label} className={FIELD}>
              <span className={LABEL}>{label}</span>
              <div className="min-h-11 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-700">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Store info */}
      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>
          <Building2 className="mr-2 inline h-4 w-4 text-neutral-400" />
          Store information
        </h2>
        <p className={SECTION_LEAD}>Update your public store name, type, logo, and description.</p>

        <div className="mt-6 flex flex-col gap-6">
          {/* Logo */}
          <div className={FIELD}>
            <span className={LABEL}>Store logo</span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                {logoPreview ? (
                  <img src={logoPreview} alt="Store logo" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-neutral-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo || saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingLogo ? "Uploading…" : logoFile ? logoFile.name : "Change logo"}
                </button>
                <p className="text-xs text-neutral-400">JPG, PNG, or WebP — max 10 MB</p>
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

          {/* Store name */}
          <div className={FIELD}>
            <label htmlFor="store-name" className={LABEL}>
              Store name <RequiredMark />
            </label>
            <input
              id="store-name"
              className={CONTROL}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              maxLength={120}
              placeholder="My Awesome Store"
            />
          </div>

          {/* Business type */}
          <div className={FIELD}>
            <label htmlFor="business-type" className={LABEL}>
              Business type <RequiredMark />
            </label>
            <select
              id="business-type"
              className={CONTROL}
              value={businessType}
              onChange={(e) =>
                setBusinessType(e.target.value as "INDIVIDUAL" | "REGISTERED_BUSINESS")
              }
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="REGISTERED_BUSINESS">Registered business</option>
            </select>
          </div>

          {/* Industry type */}
          <div className={FIELD}>
            <label htmlFor="industry-type" className={LABEL}>
              Industry type
              <span className="ml-1 font-normal normal-case text-neutral-400">(optional)</span>
            </label>
            <select
              id="industry-type"
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
            <p className="text-xs text-neutral-400">Helps customers find your store by category.</p>
          </div>

          {/* Description */}
          <div className={FIELD}>
            <label htmlFor="store-desc" className={LABEL}>
              Description
              <span className="ml-1 font-normal normal-case text-neutral-400">(optional)</span>
            </label>
            <textarea
              id="store-desc"
              rows={4}
              className={`${CONTROL} resize-y ${descOver ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell customers about your store…"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-neutral-400">Max 500 characters</p>
              <p className={`text-xs tabular-nums ${descOver ? "font-semibold text-red-600" : "text-neutral-400"}`}>
                {descLen} / 500
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Store pickup address */}
      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>
          <MapPin className="mr-2 inline h-4 w-4 text-neutral-400" />
          Store pickup address
        </h2>
        <p className={SECTION_LEAD}>
          Where orders are prepared and shipped from. Customers see delivery cost based on driving
          distance from this address to their delivery location.
        </p>

        <div className="mt-6 flex flex-col gap-5">
          <div className={FIELD}>
            <label htmlFor="store-address-line1" className={LABEL}>
              Street address <RequiredMark />
            </label>
            <AddressAutocompleteInput
              id="store-address-line1"
              className={CONTROL}
              value={addressLine1}
              placeholder="123 Main Street, Shop 4"
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className={FIELD}>
              <label htmlFor="store-city" className={LABEL}>
                City <RequiredMark />
              </label>
              <input
                id="store-city"
                className={CONTROL}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Kabul"
                maxLength={120}
              />
            </div>
            <div className={FIELD}>
              <label htmlFor="store-postal-code" className={LABEL}>
                Postal code <RequiredMark />
              </label>
              <input
                id="store-postal-code"
                className={CONTROL}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="1001"
                maxLength={40}
              />
            </div>
          </div>

          <div className={FIELD}>
            <label htmlFor="store-country" className={LABEL}>
              Country <RequiredMark />
            </label>
            <input
              id="store-country"
              className={CONTROL}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Afghanistan"
              maxLength={120}
            />
          </div>

          {!profile.address ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              <strong>Required for checkout:</strong> Add your pickup address so customers can see
              delivery pricing when they buy from your store.
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton saving={saving} label="Save business info" />
      </div>
    </form>
  );
}

/* ─── Bank / Payout Details tab ──────────────────────────────────────── */

function PayoutDetailsTab({
  profile,
  token,
  onPayoutSaved,
}: {
  profile: VendorProfile;
  token: string;
  onPayoutSaved?: () => void;
}) {
  const pm = profile.payoutMethod;
  const [accountName, setAccountName] = useState(pm?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(pm?.accountNumberOrIban ?? "");
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
      toast.error("Account name required", "Account holder name is required.");
      return;
    }
    if (!accountNumber.trim()) {
      toast.error("Account number required", "Account number or IBAN is required.");
      return;
    }
    if (!bankName.trim()) {
      toast.error("Bank name required", "Bank name is required.");
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
      toast.success("Saved", "Payout details updated.");
      onPayoutSaved?.();
    } catch (e) {
      toast.error("Could not save", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-8">
      <div className={SECTION}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10">
              <Landmark className="h-5 w-5 text-sky-800" aria-hidden />
            </div>
            <div>
              <h2 className={SECTION_TITLE}>Bank account</h2>
              <p className={SECTION_LEAD}>
                Payouts are sent by bank transfer. Enter the account that should receive your earnings.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-5">
          <div className={FIELD}>
            <label htmlFor="account-name" className={LABEL}>Account holder name</label>
            <input
              id="account-name"
              className={CONTROL}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Full legal name as on the bank account"
            />
          </div>
          <div className={FIELD}>
            <label htmlFor="account-number" className={LABEL}>Account number / IBAN</label>
            <input
              id="account-number"
              className={CONTROL}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. GB29NWBK60161331926819"
            />
          </div>
          <div className={FIELD}>
            <label htmlFor="bank-name" className={LABEL}>Bank name</label>
            <input
              id="bank-name"
              className={CONTROL}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Barclays, Standard Chartered"
            />
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            <strong>Note:</strong> Payouts are sent in USD. Your bank may apply conversion fees. Ensure the account accepts foreign wire transfers.
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton saving={saving} label="Save payout details" />
      </div>
    </form>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function VendorSettingsPage() {
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

  const fetchProfile = useCallback(async (opts?: { silent?: boolean }) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    if (!opts?.silent) {
      setDataLoading(true);
    }
    setError(null);
    try {
      const res = await fetch("/api/vendor/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse<VendorProfile>(res);
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load profile.");
    } finally {
      if (!opts?.silent) {
        setDataLoading(false);
      }
    }
  }, []);

  const token =
    typeof window !== "undefined" ? (localStorage.getItem("accessToken") ?? "") : "";

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
        "Could not load subscription status",
        e instanceof Error ? e.message : "Unknown error"
      );
      setSubscriptionStatus(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [token]);

  const startCardAttach = useCallback(async () => {
    if (!token) {
      toast.error("Please sign in again", "Your session is missing.");
      return;
    }
    if (!stripePromise) {
      toast.error(
        "Stripe publishable key missing",
        "Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and refresh."
      );
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
        throw new Error("Stripe did not return a setup client secret");
      }
      setCardSetup({
        clientSecret: data.clientSecret,
        setupIntentId: data.setupIntentId,
      });
    } catch (e) {
      toast.error(
        "Could not start card setup",
        e instanceof Error ? e.message : "Unknown error"
      );
    } finally {
      setAttachingCard(false);
    }
  }, [token]);

  const openBillingPortal = useCallback(async () => {
    if (!token) {
      toast.error("Please sign in again", "Your session is missing.");
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
      toast.error("Billing portal unavailable", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBillingLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && user) void fetchProfile();
  }, [authLoading, user, fetchProfile]);

  useEffect(() => {
    if (!authLoading && user) void loadSubscriptionStatus();
  }, [authLoading, user, loadSubscriptionStatus]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 pb-16">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              Settings
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Manage your business profile, store address, and payout details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void openBillingPortal()}
            disabled={billingLoading}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            {billingLoading ? "Opening billing..." : "Manage subscription & card"}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-6 sm:px-8">
        <nav className="-mb-px flex gap-0" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-medium transition ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Membership Billing
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Attach or update your billing card for automatic monthly membership charges.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void startCardAttach()}
                disabled={attachingCard}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                {attachingCard
                  ? "Starting..."
                  : subscriptionStatus?.defaultPaymentMethodAttached
                    ? "Update card"
                    : "Attach card"}
              </button>
              <button
                type="button"
                onClick={() => void loadSubscriptionStatus()}
                disabled={subscriptionLoading}
                className="inline-flex min-h-10 items-center rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-60"
              >
                {subscriptionLoading ? "Refreshing..." : "Refresh status"}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              <p>
                Status:{" "}
                <span className="font-semibold">{subscriptionStatus?.status ?? "—"}</span>
              </p>
              <p className="mt-1">Trial ends: {formatDate(subscriptionStatus?.trialEndsAt ?? null)}</p>
              <p className="mt-1">
                Next billing: {formatDate(subscriptionStatus?.nextBillingAt ?? null)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              <p>
                Card attached:{" "}
                <span className="font-semibold">
                  {subscriptionStatus?.defaultPaymentMethodAttached ? "Yes" : "No"}
                </span>
              </p>
              <p className="mt-1">
                Monthly fee:{" "}
                {subscriptionStatus
                  ? formatCurrency(
                      subscriptionStatus.monthlyAmount,
                      subscriptionStatus.currency
                    )
                  : "—"}
              </p>
              <p className="mt-1">
                Failed payment count: {subscriptionStatus?.failedPaymentCount ?? 0}
              </p>
            </div>
          </div>
        </section>

        {dataLoading || !profile ? (
          /* skeleton */
          <div className="flex flex-col gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-white border border-neutral-200" />
            ))}
          </div>
        ) : tab === "business" ? (
          <BusinessInfoTab
            profile={profile}
            token={token}
            onSaved={(updated) => setProfile((prev) => prev ? { ...prev, ...updated } : prev)}
          />
        ) : (
          <PayoutDetailsTab
            profile={profile}
            token={token}
            onPayoutSaved={() => void fetchProfile({ silent: true })}
          />
        )}

        {/* Saved indicator */}
        {!dataLoading && profile && (
          <div className="mt-6 flex items-center gap-2 text-xs text-neutral-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Changes are saved immediately when you click Save.
          </div>
        )}
      </div>

      {cardSetup ? (
        <Elements stripe={stripePromise} options={{ clientSecret: cardSetup.clientSecret }}>
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
