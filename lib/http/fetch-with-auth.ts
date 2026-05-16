"use client";

import { parseApiResponse } from "@/lib/http/parse-api-response";

type RefreshResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const clearStoredTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const withAuthHeader = (init: RequestInit | undefined, token: string): RequestInit => {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return {
    ...init,
    headers,
  };
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearStoredTokens();
      return null;
    }

    const data = await parseApiResponse<RefreshResponse>(response);
    localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
    return data.tokens.accessToken;
  } catch {
    clearStoredTokens();
    return null;
  }
};

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) {
    throw new Error("Session expired. Please sign in again.");
  }

  const firstResponse = await fetch(input, withAuthHeader(init, accessToken));
  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  const refreshedAccessToken = await refreshAccessToken();
  if (!refreshedAccessToken) {
    return firstResponse;
  }

  return fetch(input, withAuthHeader(init, refreshedAccessToken));
}
