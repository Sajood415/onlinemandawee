"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "next-intl";

import {
  CURRENCY_COOKIE,
  CURRENCY_LABELS,
  type SupportedCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/currency/constants";
import { convertMajorUnits } from "@/lib/currency/convert";
import { resolveInitialCurrency } from "@/lib/currency/detect";
import { formatMajorUnits } from "@/lib/currency/format";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { useAuth } from "@/store/auth-context";

const STORAGE_KEY = "selectedCurrency";

type CurrencyContextType = {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
  formatPrice: (amount: number, fromCurrency?: string) => string;
  convertPrice: (amount: number, fromCurrency?: string) => number;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

async function persistCurrencyPreference(currency: SupportedCurrency, isAuthenticated: boolean) {
  if (!isAuthenticated) return;
  try {
    await fetchWithAuth("/api/customer/preferences/currency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency }),
    });
  } catch {
    // Non-blocking: local preference still applies for this session.
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const { user, isAuthenticated } = useAuth();
  const [currency, setCurrencyState] = useState<SupportedCurrency>("USD");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = resolveInitialCurrency({
      stored: localStorage.getItem(STORAGE_KEY),
      cookie: readCookie(CURRENCY_COOKIE),
      locale,
      userPreference: user?.preferredCurrency ?? null,
    });
    setCurrencyState(initial);
    setReady(true);
  }, [locale, user?.id]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, currency);
    writeCookie(CURRENCY_COOKIE, currency);
  }, [currency, ready]);

  const setCurrency = useCallback(
    (next: SupportedCurrency) => {
      setCurrencyState(next);
      void persistCurrencyPreference(next, isAuthenticated);
    },
    [isAuthenticated]
  );

  const convertPrice = useCallback(
    (amount: number, fromCurrency = "USD") =>
      convertMajorUnits(amount, fromCurrency, currency),
    [currency]
  );

  const formatPrice = useCallback(
    (amount: number, fromCurrency = "USD") => {
      const converted = convertMajorUnits(amount, fromCurrency, currency);
      return formatMajorUnits(converted, currency, locale);
    },
    [currency, locale]
  );

  const value = useMemo(
    () => ({ currency, setCurrency, formatPrice, convertPrice }),
    [currency, setCurrency, formatPrice, convertPrice]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

export { CURRENCY_LABELS, SUPPORTED_CURRENCIES };
