import "server-only";

import {
  HAWALA_API_RATE_MINUS_PERCENT,
  HAWALA_CURRENCIES,
  HAWALA_FOREIGN_CURRENCIES,
  type HawalaCurrency,
} from "@/lib/hawala/constants";

const API_URLS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json",
  "https://latest.currency-api.pages.dev/v1/currencies/usd.min.json",
] as const;

type UsdRatesPayload = {
  date?: string;
  usd?: Record<string, number>;
};

function roundRate(value: number) {
  return Math.round(value * 10000) / 10000;
}

/** Customer rate = API rate × (1 − 2%), e.g. 65.5 → 64.19. */
export function applyHawalaApiMarkup(apiRateToAfn: number): number {
  if (!(apiRateToAfn > 0)) return 0.0001;
  const factor = 1 - HAWALA_API_RATE_MINUS_PERCENT / 100;
  return roundRate(Math.max(0.0001, apiRateToAfn * factor));
}

async function fetchUsdRatesJson(): Promise<UsdRatesPayload> {
  let lastError: unknown;
  for (const url of API_URLS) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as UsdRatesPayload;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not fetch exchange rates");
}

/**
 * Fetches mid-market rates and returns AFN value of 1 unit of each Hawala currency.
 * Customer-facing rates apply {@link HAWALA_API_RATE_MINUS_PERCENT}% markup.
 */
export async function fetchHawalaRatesFromApi(): Promise<{
  date: string | null;
  apiRatesToAfn: Record<HawalaCurrency, number>;
  displayRatesToAfn: Record<HawalaCurrency, number>;
}> {
  const payload = await fetchUsdRatesJson();
  const usd = payload.usd;
  if (!usd || typeof usd.afn !== "number" || !(usd.afn > 0)) {
    throw new Error("Exchange rate API returned invalid USD/AFN data");
  }

  const usdToAfn = usd.afn;
  const apiRatesToAfn = {} as Record<HawalaCurrency, number>;
  const displayRatesToAfn = {} as Record<HawalaCurrency, number>;

  apiRatesToAfn.AFN = 1;
  displayRatesToAfn.AFN = 1;

  for (const currency of HAWALA_FOREIGN_CURRENCIES) {
    const key = currency.toLowerCase();
    if (currency === "USD") {
      apiRatesToAfn.USD = roundRate(usdToAfn);
    } else {
      const usdPerUnit = usd[key];
      if (typeof usdPerUnit !== "number" || !(usdPerUnit > 0)) {
        throw new Error(`Exchange rate API missing ${currency}`);
      }
      apiRatesToAfn[currency] = roundRate(usdToAfn / usdPerUnit);
    }
    displayRatesToAfn[currency] = applyHawalaApiMarkup(apiRatesToAfn[currency]);
  }

  for (const currency of HAWALA_CURRENCIES) {
    if (!(apiRatesToAfn[currency] > 0) || !(displayRatesToAfn[currency] > 0)) {
      throw new Error(`Invalid computed rate for ${currency}`);
    }
  }

  return {
    date: typeof payload.date === "string" ? payload.date : null,
    apiRatesToAfn,
    displayRatesToAfn,
  };
}
