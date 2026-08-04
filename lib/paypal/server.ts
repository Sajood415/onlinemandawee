import "server-only";

import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";

type PayPalMode = "sandbox" | "live";

let cachedToken: { value: string; expiresAtMs: number } | null = null;

export function getPayPalMode(): PayPalMode {
  return env.PAYPAL_MODE === "live" ? "live" : "sandbox";
}

export function getPayPalApiBase() {
  return getPayPalMode() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured() {
  return Boolean(
    env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() && env.PAYPAL_CLIENT_SECRET?.trim()
  );
}

export function assertPayPalConfigured() {
  if (!isPayPalConfigured()) {
    throw new AppError({
      code: ERROR_CODE.INTERNAL_SERVER_ERROR,
      message: "PayPal is not configured",
      statusCode: 503,
    });
  }
}

export async function getPayPalAccessToken(): Promise<string> {
  assertPayPalConfigured();
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 30_000) {
    return cachedToken.value;
  }

  const clientId = env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!.trim();
  const secret = env.PAYPAL_CLIENT_SECRET!.trim();
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError({
      code: ERROR_CODE.INTERNAL_SERVER_ERROR,
      message: `PayPal auth failed: ${text.slice(0, 200)}`,
      statusCode: 502,
    });
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    value: data.access_token,
    expiresAtMs: now + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function paypalFetch<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string }
): Promise<T> {
  const token = await getPayPalAccessToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  if (init?.idempotencyKey) {
    headers.set("PayPal-Request-Id", init.idempotencyKey);
  }

  const response = await fetch(`${getPayPalApiBase()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof json === "object" &&
      json &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : `PayPal API error (${response.status})`;
    throw new AppError({
      code: ERROR_CODE.BAD_REQUEST,
      message,
      statusCode: response.status >= 500 ? 502 : 400,
      details: json,
    });
  }

  return json as T;
}
