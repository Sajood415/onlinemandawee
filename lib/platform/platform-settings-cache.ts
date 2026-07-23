import {
  DEFAULT_AVAILABLE_CURRENCIES,
  DEFAULT_AVAILABLE_LOCALES,
  normalizeAvailableCurrencies,
  normalizeAvailableLocales,
} from "@/lib/platform/storefront-options";

export type PlatformSettingsSnapshot = {
  availableLocales: string[];
  availableCurrencies: string[];
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/** Shared in-process cache — cuts repeated DB / self-fetch on a single VPS Node process. */
const SETTINGS_TTL_MS = 5 * 60 * 1000;

let liteCache: CacheEntry<PlatformSettingsSnapshot> | null = null;
let fullCache: CacheEntry<unknown> | null = null;

export function getCachedPlatformSettingsLite(): PlatformSettingsSnapshot | null {
  if (!liteCache || Date.now() >= liteCache.expiresAt) return null;
  return liteCache.value;
}

export function setCachedPlatformSettingsLite(value: PlatformSettingsSnapshot) {
  liteCache = {
    value: {
      availableLocales: normalizeAvailableLocales(value.availableLocales),
      availableCurrencies: normalizeAvailableCurrencies(value.availableCurrencies),
    },
    expiresAt: Date.now() + SETTINGS_TTL_MS,
  };
}

export function getCachedPlatformSettingsFull<T>(): T | null {
  if (!fullCache || Date.now() >= fullCache.expiresAt) return null;
  return fullCache.value as T;
}

export function setCachedPlatformSettingsFull<T>(value: T) {
  fullCache = {
    value,
    expiresAt: Date.now() + SETTINGS_TTL_MS,
  };

  const record = value as {
    availableLocales?: string[];
    availableCurrencies?: string[];
  };
  if (record.availableLocales && record.availableCurrencies) {
    setCachedPlatformSettingsLite({
      availableLocales: record.availableLocales,
      availableCurrencies: record.availableCurrencies,
    });
  }
}

export function invalidatePlatformSettingsCache() {
  liteCache = null;
  fullCache = null;
}

export function defaultPlatformSettingsLite(): PlatformSettingsSnapshot {
  return {
    availableLocales: [...DEFAULT_AVAILABLE_LOCALES],
    availableCurrencies: [...DEFAULT_AVAILABLE_CURRENCIES],
  };
}

export const PLATFORM_SETTINGS_CACHE_TTL_MS = SETTINGS_TTL_MS;
