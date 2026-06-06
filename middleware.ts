import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";

import { CURRENCY_COOKIE, DEFAULT_CURRENCY } from "@/lib/currency/constants";
import { detectCurrencyFromCountry } from "@/lib/currency/detect";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  if (!request.cookies.get(CURRENCY_COOKIE)?.value) {
    const country =
      request.headers.get("x-vercel-ip-country") ??
      request.headers.get("cf-ipcountry") ??
      null;
    const currency = detectCurrencyFromCountry(country) ?? DEFAULT_CURRENCY;

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
