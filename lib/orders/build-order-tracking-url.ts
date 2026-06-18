import "server-only";

import { env } from "@/config/env";
import { routing } from "@/i18n/routing";

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

export function buildGuestOrderTrackingUrl(token: string, locale = routing.defaultLocale) {
  const base = getAppBaseUrl();
  return `${base}/${locale}/orders/track/${token}`;
}
