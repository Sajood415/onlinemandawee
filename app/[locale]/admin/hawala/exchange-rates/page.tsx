"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Banknote, Loader2, Save } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import {
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
  isActive: boolean;
  updatedAt: string;
};

const INPUT =
  "w-full max-w-[220px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminHawalaExchangeRatesPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [rates, setRates] = useState<Record<HawalaCurrency, string>>(
    Object.fromEntries(HAWALA_CURRENCIES.map((currency) => [currency, ""])) as Record<
      HawalaCurrency,
      string
    >
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/hawala/exchange-rates");
      const data = await parseApiResponse<HawalaExchangeRate[]>(res);
      setRates((current) => {
        const next = { ...current };
        for (const rate of data) {
          next[rate.currency] = String(rate.rateToAfn);
        }
        return next;
      });
      const mostRecent = data
        .map((rate) => rate.updatedAt)
        .sort()
        .at(-1);
      setLastUpdated(mostRecent ?? null);
    } catch (error) {
      toast.error(
        "Failed to load exchange rates",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
        toast.error("Invalid rate", `Enter a rate greater than 0 for ${invalid.currency}.`);
        setSaving(false);
        return;
      }

      const res = await fetchWithAuth("/api/admin/hawala/exchange-rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse<HawalaExchangeRate[]>(res);
      setRates((current) => {
        const next = { ...current };
        for (const rate of data) {
          next[rate.currency] = String(rate.rateToAfn);
        }
        return next;
      });
      toast.success("Exchange rates saved", "New Hawala transfers will use these rates.");
    } catch (error) {
      toast.error("Could not save", error instanceof Error ? error.message : "Unknown error");
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
        <Link
          href="/admin/hawala"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-[#0f3460]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hawala transfers
        </Link>
        <h1 className="text-2xl font-bold text-[#0f3460]">Hawala exchange rates</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Set how much 1 unit of each currency is worth in Afghan Afghani (AFN). New transfer
          requests calculate the receiver amount using these rates at submission time.
        </p>
      </div>

      <section className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#0f3460]/10 p-2">
            <Banknote className="h-5 w-5 text-[#0f3460]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-neutral-900">Rates to AFN</h2>
            <p className="mt-1 text-sm text-neutral-600">
              AFN is the fixed base currency (rate = 1) and cannot be edited.
            </p>

            {loading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <span className="font-medium text-neutral-800">
                    {HAWALA_CURRENCY_LABELS.AFN}
                  </span>
                  <input value="1" disabled className={`${INPUT} bg-neutral-100 text-neutral-500`} />
                </div>
                {HAWALA_CURRENCIES.filter((currency) => currency !== "AFN").map((currency) => (
                  <div
                    key={currency}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 transition hover:border-neutral-300"
                  >
                    <span className="font-medium text-neutral-800">
                      {HAWALA_CURRENCY_LABELS[currency]}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={rates[currency]}
                      onChange={(event) =>
                        setRates((current) => ({ ...current, [currency]: event.target.value }))
                      }
                      className={INPUT}
                    />
                  </div>
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
          Save rates
        </button>
        {lastUpdated ? (
          <p className="mt-2 text-xs text-neutral-500">
            Last updated {new Date(lastUpdated).toLocaleString()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
