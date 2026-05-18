"use client";

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
} from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

/* ─── types ──────────────────────────────────────────────────────────── */

type PayoutMethod = "BANK" | "STRIPE";

type VendorProfile = {
  storeName: string;
  storeSlug: string;
  businessType: "INDIVIDUAL" | "REGISTERED_BUSINESS" | null;
  logoUrl: string;
  description: string;
  user: { fullName: string; email: string; phone: string };
  payoutMethod: {
    method: PayoutMethod;
    accountName: string;
    accountNumberOrIban: string;
    bankName: string;
    stripeEmail: string;
  } | null;
};

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
  const [description, setDescription] = useState(profile.description);
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(profile.logoUrl || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
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
        ...(finalLogoUrl ? { logoUrl: finalLogoUrl } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      };

      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await parseApiResponse<Partial<VendorProfile>>(res);
      onSaved(data);
      toast.success("Saved", "Business info updated successfully.");
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
}: {
  profile: VendorProfile;
  token: string;
}) {
  const pm = profile.payoutMethod;
  const [method, setMethod] = useState<PayoutMethod>(pm?.method ?? "BANK");
  const [accountName, setAccountName] = useState(pm?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(pm?.accountNumberOrIban ?? "");
  const [bankName, setBankName] = useState(pm?.bankName ?? "");
  const [paypalEmail, setPaypalEmail] = useState(pm?.stripeEmail ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (method === "BANK") {
      if (!accountName.trim()) { toast.error("Account name", "Account name is required."); return; }
      if (!accountNumber.trim()) { toast.error("Account number", "Account number or IBAN is required."); return; }
      if (!bankName.trim()) { toast.error("Bank name", "Bank name is required."); return; }
    }
    if (method === "STRIPE") {
      if (!paypalEmail.trim()) { toast.error("Email", "PayPal / Stripe email is required."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail.trim())) {
        toast.error("Email", "Enter a valid email address.");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = { method };
      if (method === "BANK") {
        body.accountName = accountName.trim();
        body.accountNumberOrIban = accountNumber.trim();
        body.bankName = bankName.trim();
      } else {
        body.stripeEmail = paypalEmail.trim();
      }

      const res = await fetch("/api/vendor/profile/payout", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      await parseApiResponse(res);
      toast.success("Saved", "Payout method updated successfully.");
    } catch (e) {
      toast.error("Could not save", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-8">
      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>
          <CreditCard className="mr-2 inline h-4 w-4 text-neutral-400" />
          Payout method
        </h2>
        <p className={SECTION_LEAD}>
          Where we send your earnings. Account name must match your ID or business registration.
        </p>

        <div className="mt-6 flex flex-col gap-6">
          {/* Method selector */}
          <div className={FIELD}>
            <label className={LABEL}>Payout type <RequiredMark /></label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["BANK", "STRIPE"] as const).map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition ${
                    method === m
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payout-method"
                    value={m}
                    checked={method === m}
                    onChange={() => setMethod(m)}
                    className="h-4 w-4 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {m === "BANK" ? "Foreign bank account" : "PayPal / Stripe"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {m === "BANK"
                        ? "International wire transfer (IBAN or account number)"
                        : "Digital wallet — PayPal or Stripe email"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* BANK fields */}
          {method === "BANK" && (
            <div className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-neutral-50/60 p-5">
              <div className={FIELD}>
                <label htmlFor="account-name" className={LABEL}>
                  Account holder name <RequiredMark />
                </label>
                <input
                  id="account-name"
                  className={CONTROL}
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Full legal name as on the bank account"
                />
              </div>
              <div className={FIELD}>
                <label htmlFor="account-number" className={LABEL}>
                  Account number / IBAN <RequiredMark />
                </label>
                <input
                  id="account-number"
                  className={CONTROL}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. GB29NWBK60161331926819"
                />
              </div>
              <div className={FIELD}>
                <label htmlFor="bank-name" className={LABEL}>
                  Bank name <RequiredMark />
                </label>
                <input
                  id="bank-name"
                  className={CONTROL}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Barclays, Standard Chartered"
                />
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                <strong>International transfer note:</strong> Payouts are sent in USD. Your bank may apply conversion fees. Ensure the account accepts foreign wire transfers.
              </div>
            </div>
          )}

          {/* STRIPE / PayPal fields */}
          {method === "STRIPE" && (
            <div className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-neutral-50/60 p-5">
              <div className={FIELD}>
                <label htmlFor="paypal-email" className={LABEL}>
                  PayPal or Stripe email <RequiredMark />
                </label>
                <input
                  id="paypal-email"
                  type="email"
                  className={CONTROL}
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <p className="text-xs text-neutral-400">
                  Enter the email linked to your PayPal or Stripe account.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton saving={saving} label="Save bank details" />
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

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setDataLoading(true);
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
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void fetchProfile();
  }, [authLoading, user, fetchProfile]);

  const token =
    typeof window !== "undefined" ? (localStorage.getItem("accessToken") ?? "") : "";

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
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your business profile and payout details.
        </p>
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
          <PayoutDetailsTab profile={profile} token={token} />
        )}

        {/* Saved indicator */}
        {!dataLoading && profile && (
          <div className="mt-6 flex items-center gap-2 text-xs text-neutral-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Changes are saved immediately when you click Save.
          </div>
        )}
      </div>
    </div>
  );
}
