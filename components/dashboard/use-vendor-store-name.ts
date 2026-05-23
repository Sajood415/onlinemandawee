"use client";

import { useCallback, useEffect, useState } from "react";

import { parseApiResponse } from "@/lib/http/parse-api-response";
import { formatVendorStoreName } from "@/lib/utils/slug";

type VendorProfileSummary = {
  storeName: string;
  storeSlug: string;
};

let storeNameCache: string | null | undefined;
let storeNamePromise: Promise<string | null> | null = null;

async function loadVendorStoreName(): Promise<string | null> {
  if (storeNameCache !== undefined) return storeNameCache;

  if (!storeNamePromise) {
    storeNamePromise = (async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return null;

      try {
        const res = await fetch("/api/vendor/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;

        const data = await parseApiResponse<VendorProfileSummary>(res);
        return formatVendorStoreName(data.storeName, data.storeSlug);
      } catch {
        return null;
      }
    })();
  }

  const name = await storeNamePromise;
  storeNameCache = name;
  storeNamePromise = null;
  return name;
}

function resetStoreNameCache(notify = false) {
  storeNameCache = undefined;
  storeNamePromise = null;
  if (notify && typeof window !== "undefined") {
    window.dispatchEvent(new Event("vendor-store-name-changed"));
  }
}

export function invalidateVendorStoreNameCache() {
  resetStoreNameCache(true);
}

export function useVendorStoreName() {
  const [storeName, setStoreName] = useState<string | null>(
    storeNameCache !== undefined ? storeNameCache : null
  );
  const [isLoading, setIsLoading] = useState(storeNameCache === undefined);

  const refresh = useCallback(async () => {
    resetStoreNameCache(false);
    setIsLoading(true);
    const name = await loadVendorStoreName();
    setStoreName(name);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (storeNameCache !== undefined) {
      setStoreName(storeNameCache);
      setIsLoading(false);
    }

    const handleStoreNameChanged = () => {
      void refresh();
    };

    window.addEventListener("vendor-store-name-changed", handleStoreNameChanged);
    return () => {
      window.removeEventListener("vendor-store-name-changed", handleStoreNameChanged);
    };
  }, [refresh]);

  useEffect(() => {
    if (storeNameCache !== undefined) return;

    let mounted = true;
    void (async () => {
      const name = await loadVendorStoreName();
      if (mounted) {
        setStoreName(name);
        setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { storeName, isLoading, refresh };
}
