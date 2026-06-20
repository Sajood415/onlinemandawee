"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { SupportedCurrency } from "@/lib/currency/constants";
import {
  DEFAULT_AVAILABLE_CURRENCIES,
  DEFAULT_AVAILABLE_LOCALES,
  type StorefrontLocale,
} from "@/lib/platform/storefront-options";

export type PlatformConfig = {
  transactionFeeLabel: string;
  availableLocales: StorefrontLocale[];
  availableCurrencies: SupportedCurrency[];
};

type PlatformConfigContextValue = PlatformConfig & {
  isLoading: boolean;
};

const defaultConfig: PlatformConfig = {
  transactionFeeLabel: "$3.99 per order",
  availableLocales: DEFAULT_AVAILABLE_LOCALES,
  availableCurrencies: DEFAULT_AVAILABLE_CURRENCIES,
};

const PlatformConfigContext = createContext<PlatformConfigContextValue>({
  ...defaultConfig,
  isLoading: true,
});

type PlatformConfigProviderProps = {
  children: ReactNode;
  initialConfig?: PlatformConfig;
};

export function PlatformConfigProvider({
  children,
  initialConfig,
}: PlatformConfigProviderProps) {
  const [config, setConfig] = useState<PlatformConfig>(initialConfig ?? defaultConfig);
  const [isLoading, setIsLoading] = useState(!initialConfig);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/platform/settings", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          data?: PlatformConfig;
        }>;
      })
      .then((payload) => {
        if (cancelled || !payload?.data) return;
        setConfig(payload.data);
      })
      .catch(() => {
        // Keep defaults when the request fails.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      ...config,
      isLoading,
    }),
    [config, isLoading]
  );

  return (
    <PlatformConfigContext.Provider value={value}>
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig() {
  return useContext(PlatformConfigContext);
}
