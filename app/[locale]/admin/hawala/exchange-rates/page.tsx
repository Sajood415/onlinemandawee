"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Banknote, Loader2, RefreshCw, Save } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import {
  HAWALA_API_RATE_MINUS_PERCENT,
  HAWALA_CURRENCIES,
  HAWALA_CURRENCY_LABELS,
  type HawalaCurrency,
} from "@/lib/hawala/constants";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type HawalaExchangeRate = {
  id: string;
  currency: HawalaCurrency;
  rateToAfn: number;
  apiRateToAfn: number | null;
  isManualOverride: boolean;
  isActive: boolean;
  apiSyncedAt: string | null;
  updatedAt: string;
};

const INPUT =
  "w-full max-w-[220px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminHawalaExchangeRatesPage() {
  const t = useTranslations("AdminPages.hawala.exchangeRates");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [rates, setRates] = useState<Record<HawalaCurrency, string>>(
    Object.fromEntries(HAWALA_CURRENCIES.map((currency) => [currency, ""])) as Record<
      HawalaCurrency,
      string
    >
  );
  const [meta, setMeta] = useState<
    Record<HawalaCurrency, Pick<HawalaExchangeRate, "isManualOverride" | "apiRateToAfn" | "apiSyncedAt">>
  >(
    Object.fromEntries(
      HAWALA_CURRENCIES.map((currency) => [
        currency,
        { isManualOverride: false, apiRateToAfn: null, apiSyncedAt: null },
      ])
    ) as Record<
      HawalaCurrency,
      Pick<HawalaExchangeRate, "isManualOverride" | "apiRateToAfn" | "apiSyncedAt">
    >
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const applyRows = (data: HawalaExchangeRate[]) => {
    setRates((current) => {
      const next = { ...current };
      for (const rate of data) {
        next[rate.currency] = String(rate.rateToAfn);
      }
      return next;
    });
    setMeta((current) => {
      const next = { ...current };
      for (const rate of data) {
        next[rate.currency] = {
          isManualOverride: rate.isManualOverride,
          apiRateToAfn: rate.apiRateToAfn,
          apiSyncedAt: rate.apiSyncedAt,
        };
      }
      return next;
    });
    const mostRecent = data
      .map((rate) => rate.apiSyncedAt ?? rate.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    setLastUpdated(mostRecent ?? null);
  };

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/hawala/exchange-rates");
      const data = await parseApiResponse<HawalaExchangeRate[]>(res);
      applyRows(data);
    } catch (error) {
      toast.error(
        t("loadError"),
        error instanceof Error ? error.message : t("unknownError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && user) void loadRates();
  }, [authLoading, user, loadRates]);

  const onSave = async () => {
    setSaving(true);
    try {
      const payload = {
        rates: HAWALA_CURRENCIES.filter((currency) => currency !== "AFN").map((currency) => ({
          currency,
          rateToAfn: Number(rates[currency]) || 0,
        })),
      };

      const invalid = payload.rates.find((rate) => !(rate.rateToAfn > 0));
      if (invalid) {
        toast.error(t("invalidRate"), t("invalidRateBody", { currency: invalid.currency }));
        setSaving(false);
        return;
      }

      const res = await fetchWithAuth("/api/admin/hawala/exchange-rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse<HawalaExchangeRate[]>(res);
      applyRows(data);
      toast.success(t("savedTitle"), t("savedBody"));
    } catch (error) {
      toast.error(t("saveFailed"), error instanceof Error ? error.message : t("unknownError"));
    } finally {
      setSaving(false);
    }
  };

  const onSync = async (overwriteManual: boolean) => {
    setSyncing(true);
    try {
      const res = await fetchWithAuth("/api/admin/hawala/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwriteManual }),
      });
      const data = await parseApiResponse<HawalaExchangeRate[]>(res);
      applyRows(data);
      toast.success(
        t("syncedTitle"),
        overwriteManual ? t("syncedOverwriteBody") : t("syncedBody")
      );
    } catch (error) {
      toast.error(t("syncFailed"), error instanceof Error ? error.message : t("unknownError"));
    } finally {
      setSyncing(false);
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
        <Link
          href="/admin/hawala"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <h1 className="text-2xl font-bold text-secondary">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-600">{t("subtitle")}</p>
        <p className="mt-2 text-sm text-neutral-500">
          {t("apiNote", { percent: HAWALA_API_RATE_MINUS_PERCENT })}
        </p>
      </div>

      <section className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-secondary/10 p-2">
            <Banknote className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-neutral-900">{t("ratesTitle")}</h2>
            <p className="mt-1 text-sm text-neutral-600">{t("ratesBody")}</p>

            {loading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading")}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <span className="font-medium text-neutral-800">
                    {HAWALA_CURRENCY_LABELS.AFN}
                  </span>
                  <input value="1" disabled className={`${INPUT} bg-neutral-100 text-neutral-500`} />
                </div>
                {HAWALA_CURRENCIES.filter((currency) => currency !== "AFN").map((currency) => {
                  const row = meta[currency];
                  return (
                    <div
                      key={currency}
                      className="rounded-xl border border-neutral-200 px-4 py-3 transition hover:border-neutral-300"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="font-medium text-neutral-800">
                            {HAWALA_CURRENCY_LABELS[currency]}
                          </span>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {row.isManualOverride ? t("sourceManual") : t("sourceApi")}
                            {row.apiRateToAfn != null
                              ? ` · ${t("apiRaw", { rate: row.apiRateToAfn })}`
                              : ""}
                          </p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={rates[currency]}
                          onChange={(event) =>
                            setRates((current) => ({
                              ...current,
                              [currency]: event.target.value,
                            }))
                          }
                          className={INPUT}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="flex max-w-2xl flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving || loading || syncing}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("save")}
        </button>
        <button
          type="button"
          disabled={saving || loading || syncing}
          onClick={() => void onSync(false)}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("syncApi")}
        </button>
        <button
          type="button"
          disabled={saving || loading || syncing}
          onClick={() => void onSync(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {t("syncOverwrite")}
        </button>
      </div>
      {lastUpdated ? (
        <p className="max-w-2xl text-xs text-neutral-500">
          {t("lastUpdated", {
            date: new Date(lastUpdated).toLocaleString(locale, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
        </p>
      ) : null}
    </div>
  );
}
