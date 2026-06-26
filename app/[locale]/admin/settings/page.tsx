"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, Globe, Loader2, Save } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from "@/lib/currency/constants";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import {
  ALL_STOREFRONT_LOCALES,
  LOCALE_LABELS,
  type StorefrontLocale,
} from "@/lib/platform/storefront-options";
import type { SupportedCurrency } from "@/lib/currency/constants";
import { toast } from "@/lib/utils/toast";

type PlatformSettings = {
  id: string;
  availableLocales: StorefrontLocale[];
  availableCurrencies: SupportedCurrency[];
  updatedAt: string;
};

const INPUT =
  "w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const CHECKBOX_CARD =
  "flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm transition hover:border-neutral-300";

export default function AdminSettingsPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [availableLocales, setAvailableLocales] = useState<StorefrontLocale[]>([
    ...ALL_STOREFRONT_LOCALES,
  ]);
  const [availableCurrencies, setAvailableCurrencies] = useState<SupportedCurrency[]>([
    ...SUPPORTED_CURRENCIES,
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/admin/platform-settings");
      const data = await parseApiResponse<PlatformSettings>(res);
      setSettings(data);
      setAvailableLocales(data.availableLocales);
      setAvailableCurrencies(data.availableCurrencies);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void loadSettings();
  }, [authLoading, user, loadSettings]);

  const toggleLocale = (locale: StorefrontLocale) => {
    setAvailableLocales((current) => {
      if (current.includes(locale)) {
        if (current.length === 1) {
          toast.error("At least one language", "Keep at least one language enabled.");
          return current;
        }
        return current.filter((item) => item !== locale);
      }
      return [...current, locale];
    });
  };

  const toggleCurrency = (currency: SupportedCurrency) => {
    setAvailableCurrencies((current) => {
      if (current.includes(currency)) {
        if (current.length === 1) {
          toast.error("At least one currency", "Keep at least one currency enabled.");
          return current;
        }
        return current.filter((item) => item !== currency);
      }
      return [...current, currency];
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableLocales,
          availableCurrencies,
        }),
      });
      const data = await parseApiResponse<PlatformSettings>(res);
      setSettings(data);
      setAvailableLocales(data.availableLocales);
      setAvailableCurrencies(data.availableCurrencies);
      toast.success("Settings saved", "Platform settings updated for the storefront.");
    } catch (e) {
      toast.error("Could not save", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f3460]">Platform settings</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Configure which languages and currencies customers can use on the storefront.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#0f3460]/10 p-2">
            <Globe className="h-5 w-5 text-[#0f3460]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-neutral-900">Customer languages</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Choose which languages appear in the storefront language selector. Disabled
              languages redirect customers to the first enabled language.
            </p>

            {loading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {ALL_STOREFRONT_LOCALES.map((locale) => (
                  <label key={locale} className={CHECKBOX_CARD}>
                    <input
                      type="checkbox"
                      checked={availableLocales.includes(locale)}
                      onChange={() => toggleLocale(locale)}
                    />
                    <span className="font-medium text-neutral-800">{LOCALE_LABELS[locale]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#0f3460]/10 p-2">
            <DollarSign className="h-5 w-5 text-[#0f3460]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-neutral-900">Customer currencies</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Choose which currencies customers can select for browsing and checkout.
            </p>

            {loading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <label key={currency} className={CHECKBOX_CARD}>
                    <input
                      type="checkbox"
                      checked={availableCurrencies.includes(currency)}
                      onChange={() => toggleCurrency(currency)}
                    />
                    <span className="font-medium text-neutral-800">
                      {CURRENCY_LABELS[currency]}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-2xl">
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </button>
        {settings ? (
          <p className="mt-2 text-xs text-neutral-500">
            Last updated {new Date(settings.updatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
