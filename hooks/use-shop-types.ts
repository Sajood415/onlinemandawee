"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

import {
  fetchPublicShopTypes,
  type PublicShopTypeOption,
} from "@/lib/vendors/public-vendor-listing";

export function useShopTypes() {
  const locale = useLocale();
  const [shopTypes, setShopTypes] = useState<PublicShopTypeOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void fetchPublicShopTypes(locale)
      .then((types) => {
        if (mounted) setShopTypes(types);
      })
      .catch(() => {
        if (mounted) setShopTypes([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [locale]);

  return { shopTypes, loading };
}
