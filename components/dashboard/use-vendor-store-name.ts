"use client";

import { useCallback, useEffect, useState } from "react";

import { parseApiResponse } from "@/lib/http/parse-api-response";
import { formatVendorStoreName } from "@/lib/utils/slug";
import {
  clearVendorStoreNameCacheForUser,
  invalidateVendorStoreNameCache,
  loadVendorStoreNameForUser,
  registerVendorStoreNameFetcher,
} from "@/lib/vendor/store-name-cache";
import { useAuth } from "@/store/auth-context";

type VendorProfileSummary = {
  storeName: string;
  storeSlug: string;
};

registerVendorStoreNameFetcher(async () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  try {
    const res = await fetch("/api/vendor/profile", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await parseApiResponse<VendorProfileSummary>(res);
    return formatVendorStoreName(data.storeName, data.storeSlug);
  } catch {
    return null;
  }
});

export { invalidateVendorStoreNameCache };

export function useVendorStoreName() {
  const { user } = useAuth();
  const userId = user?.role === "VENDOR" ? user.id : null;

  const [storeName, setStoreName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setStoreName(null);
      setIsLoading(false);
      return;
    }

    clearVendorStoreNameCacheForUser(userId);
    setIsLoading(true);
    const name = await loadVendorStoreNameForUser(userId);
    setStoreName(name);
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
      setIsLoading(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    void (async () => {
      const name = await loadVendorStoreNameForUser(userId);
      if (mounted) {
        setStoreName(name);
        setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { storeName, isLoading, refresh };
}
