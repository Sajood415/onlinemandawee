import "server-only";

import { env } from "@/config/env";
import { routing } from "@/i18n/routing";

type AppLocale = (typeof routing.locales)[number];

export function getAppBaseUrl() {
  if (env.APP_URL) {
    let base = env.APP_URL.replace(/\/$/, "");
    for (const locale of routing.locales) {
      if (base.endsWith(`/${locale}`)) {
        base = base.slice(0, -(`/${locale}`.length));
        break;
      }
    }
    return base;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("APP_URL is required in production.");
  }

  return "http://localhost:3000";
}

export function buildGuestOrderTrackingUrl(
  token: string,
  locale: AppLocale = routing.defaultLocale
) {
  const base = getAppBaseUrl();
  return `${base}/${locale}/orders/track/${token}`;
}

export function buildAccountOrdersUrl(locale: AppLocale = routing.defaultLocale) {
  const base = getAppBaseUrl();
  return `${base}/${locale}/account`;
}

/** Prefer guest track link; fall back to signed-in account orders. */
export function buildCustomerOrderTrackingUrl(input: {
  guestTrackingToken?: string | null;
  guestEmail?: string | null;
  hasUserAccount?: boolean;
  locale?: AppLocale;
}) {
  const locale = input.locale ?? routing.defaultLocale;
  if (input.guestTrackingToken && input.guestEmail) {
    return buildGuestOrderTrackingUrl(input.guestTrackingToken, locale);
  }
  if (input.hasUserAccount) {
    return buildAccountOrdersUrl(locale);
  }
  return undefined;
}
