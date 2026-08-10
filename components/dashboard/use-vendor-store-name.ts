"use client";

import { useCallback, useEffect, useState } from "react";

import { parseApiResponse } from "@/lib/http/parse-api-response";
import { formatVendorStoreName } from "@/lib/utils/slug";
import {
  clearVendorStoreNameCacheForUser,
  invalidateVendorStoreNameCache,
  loadVendorStoreProfileForUser,
  registerVendorStoreNameFetcher,
} from "@/lib/vendor/store-name-cache";
import { useAuth } from "@/store/auth-context";

type VendorProfileSummary = {
  storeName: string;
  storeSlug: string;
};

registerVendorStoreNameFetcher(async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return { storeName: null, storeSlug: null };

  try {
    const res = await fetch("/api/vendor/profile", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { storeName: null, storeSlug: null };

    const data = await parseApiResponse<VendorProfileSummary>(res);
    return {
      storeName: formatVendorStoreName(data.storeName, data.storeSlug),
      storeSlug: data.storeSlug?.trim() || null,
    };
  } catch {
    return { storeName: null, storeSlug: null };
  }
});

export { invalidateVendorStoreNameCache };

export function useVendorStoreName() {
  const { user } = useAuth();
  const userId = user?.role === "VENDOR" ? user.id : null;

  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setStoreName(null);
      setStoreSlug(null);
      setIsLoading(false);
      return;
    }

    clearVendorStoreNameCacheForUser(userId);
    setIsLoading(true);
    const profile = await loadVendorStoreProfileForUser(userId);
    setStoreName(profile.storeName);
    setStoreSlug(profile.storeSlug);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    const handleStoreNameChanged = () => {
      void refresh();
    };

    window.addEventListener("vendor-store-name-changed", handleStoreNameChanged);
    return () => {
      window.removeEventListener("vendor-store-name-changed", handleStoreNameChanged);
    };
  }, [refresh]);

  useEffect(() => {
    if (!userId) {
      setStoreName(null);
      setStoreSlug(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    void (async () => {
      const profile = await loadVendorStoreProfileForUser(userId);
      if (mounted) {
        setStoreName(profile.storeName);
        setStoreSlug(profile.storeSlug);
        setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { storeName, storeSlug, isLoading, refresh };
}
