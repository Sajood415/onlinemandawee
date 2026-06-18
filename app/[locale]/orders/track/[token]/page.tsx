"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Loader2 } from "lucide-react";

import {
  GuestOrderTrackingShell,
  GuestOrderTrackingView,
} from "@/components/orders/GuestOrderTrackingView";
import { getGuestOrderTrackingCopy } from "@/components/orders/guest-order-tracking-copy";
import type { GuestPublicOrder } from "@/lib/orders/guest-public-order-types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { parseApiResponse } from "@/lib/http/parse-api-response";

export default function GuestOrderTrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const locale = useLocale() as SupportedLocale;
  const copy = getGuestOrderTrackingCopy(locale);
  const [order, setOrder] = useState<GuestPublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const resolved = await params;
        if (!mounted) return;

        const response = await fetch(`/api/orders/guest/track/${encodeURIComponent(resolved.token)}`);
        const data = await parseApiResponse<{ order: GuestPublicOrder }>(response);
        if (mounted) setOrder(data.order);
      } catch (trackError) {
        if (mounted) {
          setOrder(null);
          setError(trackError instanceof Error ? trackError.message : copy.loadError);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [copy.loadError, params]);

  return (
    <GuestOrderTrackingShell title={copy.trackOrder} subtitle={copy.lookupSubtitle}>
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {copy.loading}
        </div>
      ) : error || !order ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error ?? copy.invalidLink}</p>
          <Link
            href="/orders"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
          >
            {copy.findOrder}
          </Link>
        </div>
      ) : (
        <GuestOrderTrackingView order={order} showLookupPrompt />
      )}
    </GuestOrderTrackingShell>
  );
}
