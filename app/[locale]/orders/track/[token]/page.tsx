"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Loader2 } from "lucide-react";

import { GuestOrderTrackingShell } from "@/components/orders/GuestOrderTrackingShell";
import { GuestOrderTrackingView } from "@/components/orders/GuestOrderTrackingView";
import { getGuestOrderTrackingCopy } from "@/components/orders/guest-order-tracking-copy";
import { Link } from "@/i18n/navigation";
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
    <GuestOrderTrackingShell title={copy.trackOrder} subtitle={copy.orderDetails}>
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center bg-white px-5 py-10 text-sm text-neutral-500 shadow-[0_20px_50px_-28px_rgba(15,52,96,0.35)]">
          <Loader2 className="me-2 h-5 w-5 animate-spin text-[#0F3460]/40" />
          {copy.loading}
        </div>
      ) : error || !order ? (
        <div className="bg-white px-5 py-10 text-center shadow-[0_20px_50px_-28px_rgba(15,52,96,0.35)] sm:px-8">
          <p className="text-sm text-neutral-700">{error ?? copy.invalidLink}</p>
          <Link
            href="/orders"
            className="mt-6 inline-flex items-center justify-center bg-[#0F3460] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
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
