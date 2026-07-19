"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { AddressAutocompleteInput } from "@/components/address/AddressAutocompleteInput";
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
  warehouseAddressLine1: string | null;
  warehouseCity: string | null;
  warehouseCountry: string | null;
  warehousePostalCode: string | null;
  updatedAt: string;
};

type SettingsTab = "languages" | "currencies" | "warehouse";

const INPUT =
  "w-full max-w-xs rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const CHECKBOX_CARD =
  "flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm transition hover:border-neutral-300";

function formatDateLabel(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSettingsPage() {
  const t = useTranslations("AdminPages.settings");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [tab, setTab] = useState<SettingsTab>("languages");

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [availableLocales, setAvailableLocales] = useState<StorefrontLocale[]>([
    ...ALL_STOREFRONT_LOCALES,
  ]);
  const [availableCurrencies, setAvailableCurrencies] = useState<SupportedCurrency[]>([
    ...SUPPORTED_CURRENCIES,
  ]);
  const [warehouseAddressLine1, setWarehouseAddressLine1] = useState("");
  const [warehouseCity, setWarehouseCity] = useState("");
  const [warehouseCountry, setWarehouseCountry] = useState("");
  const [warehousePostalCode, setWarehousePostalCode] = useState("");
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
      setWarehouseAddressLine1(data.warehouseAddressLine1 ?? "");
      setWarehouseCity(data.warehouseCity ?? "");
      setWarehouseCountry(data.warehouseCountry ?? "");
      setWarehousePostalCode(data.warehousePostalCode ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && user) void loadSettings();
  }, [authLoading, user, loadSettings]);

  const toggleLocale = (localeCode: StorefrontLocale) => {
    setAvailableLocales((current) => {
      if (current.includes(localeCode)) {
        if (current.length === 1) {
          toast.error(t("toasts.localeMinTitle"), t("toasts.localeMinBody"));
          return current;
        }
        return current.filter((item) => item !== localeCode);
      }
      return [...current, localeCode];
    });
  };

  const toggleCurrency = (currency: SupportedCurrency) => {
    setAvailableCurrencies((current) => {
      if (current.includes(currency)) {
        if (current.length === 1) {
          toast.error(t("toasts.currencyMinTitle"), t("toasts.currencyMinBody"));
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
          warehouseAddressLine1,
          warehouseCity,
          warehouseCountry,
          warehousePostalCode,
        }),
      });
      const data = await parseApiResponse<PlatformSettings>(res);
      setSettings(data);
      setAvailableLocales(data.availableLocales);
      setAvailableCurrencies(data.availableCurrencies);
      setWarehouseAddressLine1(data.warehouseAddressLine1 ?? "");
      setWarehouseCity(data.warehouseCity ?? "");
      setWarehouseCountry(data.warehouseCountry ?? "");
      setWarehousePostalCode(data.warehousePostalCode ?? "");
      toast.success(t("toasts.savedTitle"), t("toasts.savedBody"));
    } catch (e) {
      toast.error(
        t("toasts.saveFailedTitle"),
        e instanceof Error ? e.message : t("toasts.unknownError")
      );
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

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "languages", label: t("tabs.languages") },
    { id: "currencies", label: t("tabs.currencies") },
    { id: "warehouse", label: t("tabs.warehouse") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadSettings()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-px">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? "border-[#0f3460] text-[#0f3460]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <section className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          {tab === "languages" ? (
            <>
              <h2 className="text-base font-semibold text-neutral-900">{t("languagesTitle")}</h2>
              <p className="mt-1 text-sm text-neutral-600">{t("languagesBody")}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {ALL_STOREFRONT_LOCALES.map((localeCode) => (
                  <label key={localeCode} className={CHECKBOX_CARD}>
                    <input
                      type="checkbox"
                      checked={availableLocales.includes(localeCode)}
                      onChange={() => toggleLocale(localeCode)}
                    />
                    <span className="font-medium text-neutral-800">
                      {LOCALE_LABELS[localeCode]}
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : null}

          {tab === "currencies" ? (
            <>
              <h2 className="text-base font-semibold text-neutral-900">{t("currenciesTitle")}</h2>
              <p className="mt-1 text-sm text-neutral-600">{t("currenciesBody")}</p>
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
            </>
          ) : null}

          {tab === "warehouse" ? (
            <>
              <h2 className="text-base font-semibold text-neutral-900">{t("warehouseTitle")}</h2>
              <p className="mt-1 text-sm text-neutral-600">{t("warehouseBody")}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-neutral-700 sm:col-span-2">
                  {t("addressLine")}
                  <AddressAutocompleteInput
                    className={`${INPUT} mt-1 max-w-none`}
                    value={warehouseAddressLine1}
                    placeholder={t("addressPlaceholder")}
                    onTextChange={setWarehouseAddressLine1}
                    onPlaceSelect={(place) => {
                      setWarehouseAddressLine1(place.addressLine1);
                      if (place.city) setWarehouseCity(place.city);
                      if (place.country) setWarehouseCountry(place.country);
                      if (place.postalCode) setWarehousePostalCode(place.postalCode);
                    }}
                  />
                </label>
                <label className="text-sm text-neutral-700">
                  {t("city")}
                  <input
                    type="text"
                    className={`${INPUT} mt-1 max-w-none`}
                    value={warehouseCity}
                    onChange={(event) => setWarehouseCity(event.target.value)}
                    placeholder={t("city")}
                  />
                </label>
                <label className="text-sm text-neutral-700">
                  {t("country")}
                  <input
                    type="text"
                    className={`${INPUT} mt-1 max-w-none`}
                    value={warehouseCountry}
                    onChange={(event) => setWarehouseCountry(event.target.value)}
                    placeholder={t("country")}
                  />
                </label>
                <label className="text-sm text-neutral-700">
                  {t("postalCode")}
                  <input
                    type="text"
                    className={`${INPUT} mt-1 max-w-none`}
                    value={warehousePostalCode}
                    onChange={(event) => setWarehousePostalCode(event.target.value)}
                    placeholder={t("postalPlaceholder")}
                  />
                </label>
              </div>
            </>
          ) : null}
        </section>
      )}

      <div className="max-w-2xl">
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? t("saving") : t("save")}
        </button>
        {settings ? (
          <p className="mt-2 text-xs text-neutral-500">
            {t("lastUpdated", { date: formatDateLabel(settings.updatedAt, locale) })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
