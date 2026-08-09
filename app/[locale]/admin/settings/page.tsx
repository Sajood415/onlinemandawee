"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
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

type BlockedKeyword = {
  id: string;
  word: string;
  createdAt: string;
  updatedAt: string;
};

type ShopTypeRow = {
  id: string;
  slug: string;
  name: string;
  namePs: string;
  nameFa: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type SettingsTab =
  | "languages"
  | "currencies"
  | "warehouse"
  | "keywords"
  | "shopTypes";

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
  const [keywords, setKeywords] = useState<BlockedKeyword[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
  const [shopTypes, setShopTypes] = useState<ShopTypeRow[]>([]);
  const [shopTypesLoading, setShopTypesLoading] = useState(false);
  const [shopTypeName, setShopTypeName] = useState("");
  const [shopTypeNamePs, setShopTypeNamePs] = useState("");
  const [shopTypeNameFa, setShopTypeNameFa] = useState("");
  const [shopTypeSort, setShopTypeSort] = useState("0");
  const [addingShopType, setAddingShopType] = useState(false);
  const [savingShopTypeId, setSavingShopTypeId] = useState<string | null>(null);
  const [deletingShopTypeId, setDeletingShopTypeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeywords = useCallback(async () => {
    setKeywordsLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/product-keywords");
      const data = await parseApiResponse<BlockedKeyword[]>(res);
      setKeywords(data);
    } catch (e) {
      toast.error(
        t("toasts.keywordAddFailed"),
        e instanceof Error ? e.message : t("toasts.unknownError")
      );
    } finally {
      setKeywordsLoading(false);
    }
  }, [t]);

  const loadShopTypes = useCallback(async () => {
    setShopTypesLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/shop-types");
      const data = await parseApiResponse<ShopTypeRow[]>(res);
      setShopTypes(data);
    } catch (e) {
      toast.error(
        t("toasts.shopTypeLoadFailed"),
        e instanceof Error ? e.message : t("toasts.unknownError")
      );
    } finally {
      setShopTypesLoading(false);
    }
  }, [t]);

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
      await Promise.all([loadKeywords(), loadShopTypes()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [loadKeywords, loadShopTypes, t]);

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

  const onAddKeyword = async () => {
    const word = keywordInput.trim();
    if (!word) return;
    setAddingKeyword(true);
    try {
      const res = await fetchWithAuth("/api/admin/product-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      const created = await parseApiResponse<BlockedKeyword>(res);
      setKeywords((current) =>
        [...current, created].sort((a, b) =>
          a.word.localeCompare(b.word, undefined, { sensitivity: "base" })
        )
      );
      setKeywordInput("");
      toast.success(t("toasts.keywordAdded"));
    } catch (e) {
      toast.error(
        t("toasts.keywordAddFailed"),
        e instanceof Error ? e.message : t("toasts.unknownError")
      );
    } finally {
      setAddingKeyword(false);
    }
  };

  const onDeleteKeyword = async (id: string) => {
    setDeletingKeywordId(id);
    try {
      const res = await fetchWithAuth(`/api/admin/product-keywords/${id}`, {
        method: "DELETE",
      });
      await parseApiResponse(res);
      setKeywords((current) => current.filter((item) => item.id !== id));
      toast.success(t("toasts.keywordDeleted"));
    } catch (e) {
      toast.error(
        t("toasts.keywordDeleteFailed"),
        e instanceof Error ? e.message : t("toasts.unknownError")
      );
    } finally {
      setDeletingKeywordId(null);
    }
  };

  const onAddShopType = async () => {
    const name = shopTypeName.trim();
    if (!name) return;
    setAddingShopType(true);
    try {
      const sortOrder = Number.parseInt(shopTypeSort, 10);
      const res = await fetchWithAuth("/api/admin/shop-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
          translations: {
            ps: shopTypeNamePs.trim() ? { name: shopTypeNamePs.trim() } : undefined,
            "fa-AF": shopTypeNameFa.trim()
              ? { name: shopTypeNameFa.trim() }
              : undefined,
          },
        }),
      });
      const created = await parseApiResponse<ShopTypeRow>(res);
      setShopTypes((current) =>
        [...current, created].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
        )
      );
      setShopTypeName("");
      setShopTypeNamePs("");
      setShopTypeNameFa("");
      setShopTypeSort("0");
      toast.success(t("toasts.shopTypeAdded"));
    } catch (e) {
      toast.error(
        t("toasts.shopTypeAddFailed"),
        e instanceof Error ? e.message : t("toasts.unknownError")
      );
    } finally {
      setAddingShopType(false);
    }
  };

  const onPatchShopType = async (
    id: string,
    patch: Partial<{
      name: string;
      namePs: string;
      nameFa: string;
      isActive: boolean;
      sortOrder: number;
    }>
  ) => {
    setSavingShopTypeId(id);
    try {
      const current = shopTypes.find((item) => item.id === id);
      if (!current) return;
      const res = await fetchWithAuth(`/api/admin/shop-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: patch.name ?? current.name,
          isActive: patch.isActive ?? current.isActive,
          sortOrder: patch.sortOrder ?? current.sortOrder,
          translations: {
            ps: {
              name: (patch.namePs ?? current.namePs).trim() || undefined,
            },
            "fa-AF": {
              name: (patch.nameFa ?? current.nameFa).trim() || undefined,
            },
          },
        }),
      });
      const updated = await parseApiResponse<ShopTypeRow>(res);
      setShopTypes((rows) =>
        rows
          .map((row) => (row.id === id ? updated : row))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      );
      toast.success(t("toasts.shopTypeSaved"));
    } catch (e) {
      toast.error(
        t("toasts.shopTypeSaveFailed"),
        e instanceof Error ? e.message : t("toasts.unknownError")
      );
    } finally {
      setSavingShopTypeId(null);
    }
  };

  const onDeleteShopType = async (id: string) => {
    if (!window.confirm(t("shopTypesDeleteConfirm"))) return;
    setDeletingShopTypeId(id);
    try {
      const res = await fetchWithAuth(`/api/admin/shop-types/${id}`, {
        method: "DELETE",
      });
      await parseApiResponse(res);
      setShopTypes((current) => current.filter((item) => item.id !== id));
      toast.success(t("toasts.shopTypeDeleted"));
    } catch (e) {
      toast.error(
        t("toasts.shopTypeDeleteFailed"),
        e instanceof Error ? e.message : t("toasts.unknownError")
      );
    } finally {
      setDeletingShopTypeId(null);
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
    { id: "shopTypes", label: t("tabs.shopTypes") },
    { id: "keywords", label: t("tabs.keywords") },
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
        <section
          className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 ${
            tab === "shopTypes" ? "max-w-4xl" : "max-w-2xl"
          }`}
        >
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

          {tab === "keywords" ? (
            <>
              <h2 className="text-base font-semibold text-neutral-900">{t("keywordsTitle")}</h2>
              <p className="mt-1 text-sm text-neutral-600">{t("keywordsBody")}</p>

              <form
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onAddKeyword();
                }}
              >
                <input
                  type="text"
                  className={`${INPUT} max-w-none flex-1`}
                  value={keywordInput}
                  onChange={(event) => setKeywordInput(event.target.value)}
                  placeholder={t("keywordsPlaceholder")}
                  maxLength={80}
                />
                <button
                  type="submit"
                  disabled={addingKeyword || !keywordInput.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
                >
                  {addingKeyword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {addingKeyword ? t("keywordsAdding") : t("keywordsAdd")}
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {keywordsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                  </div>
                ) : keywords.length === 0 ? (
                  <p className="text-sm text-neutral-500">{t("keywordsEmpty")}</p>
                ) : (
                  keywords.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-neutral-900">{item.word}</span>
                      <button
                        type="button"
                        disabled={deletingKeywordId === item.id}
                        onClick={() => void onDeleteKeyword(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingKeywordId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        {deletingKeywordId === item.id
                          ? t("keywordsDeleting")
                          : t("keywordsDelete")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}

          {tab === "shopTypes" ? (
            <>
              <h2 className="text-lg font-semibold text-neutral-900">{t("shopTypesTitle")}</h2>
              <p className="mt-1 text-sm text-neutral-600">{t("shopTypesBody")}</p>

              <form
                className="mt-4 grid gap-3 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void onAddShopType();
                }}
              >
                <input
                  type="text"
                  className={`${INPUT} max-w-none`}
                  value={shopTypeName}
                  onChange={(event) => setShopTypeName(event.target.value)}
                  placeholder={t("shopTypesNameEn")}
                  maxLength={120}
                />
                <input
                  type="text"
                  className={`${INPUT} max-w-none`}
                  value={shopTypeNamePs}
                  onChange={(event) => setShopTypeNamePs(event.target.value)}
                  placeholder={t("shopTypesNamePs")}
                  maxLength={120}
                />
                <input
                  type="text"
                  className={`${INPUT} max-w-none`}
                  value={shopTypeNameFa}
                  onChange={(event) => setShopTypeNameFa(event.target.value)}
                  placeholder={t("shopTypesNameFa")}
                  maxLength={120}
                />
                <input
                  type="number"
                  min={0}
                  className={`${INPUT} max-w-none`}
                  value={shopTypeSort}
                  onChange={(event) => setShopTypeSort(event.target.value)}
                  placeholder={t("shopTypesSort")}
                />
                <button
                  type="submit"
                  disabled={addingShopType || !shopTypeName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60 sm:col-span-2 sm:w-fit"
                >
                  {addingShopType ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {addingShopType ? t("shopTypesAdding") : t("shopTypesAdd")}
                </button>
              </form>

              <div className="mt-4 space-y-3">
                {shopTypesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                  </div>
                ) : shopTypes.length === 0 ? (
                  <p className="text-sm text-neutral-500">{t("shopTypesEmpty")}</p>
                ) : (
                  shopTypes.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-neutral-200 p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          {item.slug}
                        </p>
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                            <input
                              type="checkbox"
                              checked={item.isActive}
                              disabled={savingShopTypeId === item.id}
                              onChange={(event) =>
                                void onPatchShopType(item.id, {
                                  isActive: event.target.checked,
                                })
                              }
                            />
                            {item.isActive ? t("shopTypesActive") : t("shopTypesInactive")}
                          </label>
                          <button
                            type="button"
                            disabled={deletingShopTypeId === item.id}
                            onClick={() => void onDeleteShopType(item.id)}
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingShopTypeId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            {t("shopTypesDelete")}
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <input
                          type="text"
                          className={`${INPUT} max-w-none`}
                          defaultValue={item.name}
                          key={`${item.id}-en-${item.updatedAt}`}
                          onBlur={(event) => {
                            const next = event.target.value.trim();
                            if (next && next !== item.name) {
                              void onPatchShopType(item.id, { name: next });
                            }
                          }}
                          placeholder={t("shopTypesNameEn")}
                        />
                        <input
                          type="text"
                          className={`${INPUT} max-w-none`}
                          defaultValue={item.namePs}
                          key={`${item.id}-ps-${item.updatedAt}`}
                          onBlur={(event) => {
                            const next = event.target.value.trim();
                            if (next !== item.namePs) {
                              void onPatchShopType(item.id, { namePs: next });
                            }
                          }}
                          placeholder={t("shopTypesNamePs")}
                        />
                        <input
                          type="text"
                          className={`${INPUT} max-w-none`}
                          defaultValue={item.nameFa}
                          key={`${item.id}-fa-${item.updatedAt}`}
                          onBlur={(event) => {
                            const next = event.target.value.trim();
                            if (next !== item.nameFa) {
                              void onPatchShopType(item.id, { nameFa: next });
                            }
                          }}
                          placeholder={t("shopTypesNameFa")}
                        />
                        <input
                          type="number"
                          min={0}
                          className={`${INPUT} max-w-none`}
                          defaultValue={item.sortOrder}
                          key={`${item.id}-sort-${item.updatedAt}`}
                          onBlur={(event) => {
                            const next = Number.parseInt(event.target.value, 10);
                            if (Number.isFinite(next) && next !== item.sortOrder) {
                              void onPatchShopType(item.id, { sortOrder: next });
                            }
                          }}
                          placeholder={t("shopTypesSort")}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </section>
      )}

      {tab !== "keywords" && tab !== "shopTypes" ? (
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
      ) : null}
    </div>
  );
}
