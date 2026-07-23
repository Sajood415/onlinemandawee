import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { CURRENCY_COOKIE, DEFAULT_CURRENCY } from "@/lib/currency/constants";
import { detectCurrencyFromCountry } from "@/lib/currency/detect";
import {
  PLATFORM_SETTINGS_CACHE_TTL_MS,
  getCachedPlatformSettingsLite,
  setCachedPlatformSettingsLite,
} from "@/lib/platform/platform-settings-cache";
import {
  DEFAULT_AVAILABLE_CURRENCIES,
  DEFAULT_AVAILABLE_LOCALES,
  normalizeAvailableCurrencies,
  normalizeAvailableLocales,
} from "@/lib/platform/storefront-options";

const intlMiddleware = createMiddleware(routing);

async function getPlatformSettings(request: NextRequest) {
  const cached = getCachedPlatformSettingsLite();
  if (cached) return cached;

  try {
    const response = await fetch(new URL("/api/platform/settings", request.url), {
      headers: { "x-platform-settings-fetch": "1" },
      next: { revalidate: Math.floor(PLATFORM_SETTINGS_CACHE_TTL_MS / 1000) },
    });

    if (!response.ok) {
      throw new Error("Failed to load platform settings");
    }

    const payload = (await response.json()) as {
      data?: {
        availableLocales?: string[];
        availableCurrencies?: string[];
      };
    };

    const next = {
      availableLocales: normalizeAvailableLocales(payload.data?.availableLocales),
      availableCurrencies: normalizeAvailableCurrencies(
        payload.data?.availableCurrencies
      ),
    };
    setCachedPlatformSettingsLite(next);
    return next;
  } catch {
    const fallback = {
      availableLocales: [...DEFAULT_AVAILABLE_LOCALES],
      availableCurrencies: [...DEFAULT_AVAILABLE_CURRENCIES],
    };
    setCachedPlatformSettingsLite(fallback);
    return fallback;
  }
}

export default async function middleware(request: NextRequest) {
  const platformSettings = await getPlatformSettings(request);
  const pathname = request.nextUrl.pathname;
  const localeSegment = pathname.split("/")[1];

  if (
    localeSegment &&
    routing.locales.includes(localeSegment as (typeof routing.locales)[number]) &&
    !platformSettings.availableLocales.includes(localeSegment)
  ) {
    const fallbackLocale = platformSettings.availableLocales[0] ?? routing.defaultLocale;
    const redirectedPath = pathname.replace(`/${localeSegment}`, `/${fallbackLocale}`);
    return NextResponse.redirect(new URL(redirectedPath, request.url));
  }

  const response = intlMiddleware(request);

  if (!request.cookies.get(CURRENCY_COOKIE)?.value) {
    // Production (VPS): Cloudflare Free proxy sends cf-ipcountry.
    // Local / bare VPS without CF: set GEO_COUNTRY_OVERRIDE=US|CA|GB|FR in .env.local
    const country =
      request.headers.get("cf-ipcountry") ??
      request.headers.get("x-vercel-ip-country") ??
      process.env.GEO_COUNTRY_OVERRIDE?.trim() ??
      null;
    const detected = detectCurrencyFromCountry(country) ?? DEFAULT_CURRENCY;
    const currency = platformSettings.availableCurrencies.includes(detected)
      ? detected
      : platformSettings.availableCurrencies[0] ?? DEFAULT_CURRENCY;

    response.cookies.set(CURRENCY_COOKIE, currency, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
