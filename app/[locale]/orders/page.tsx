"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2, Search } from "lucide-react";

import {
  GuestOrderTrackingShell,
  GuestOrderTrackingView,
} from "@/components/orders/GuestOrderTrackingView";
import { getGuestOrderTrackingCopy } from "@/components/orders/guest-order-tracking-copy";
import type { GuestPublicOrder } from "@/lib/orders/guest-public-order-types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type LookupResponse = {
  order: GuestPublicOrder;
  trackingToken: string | null;
};

export default function OrdersLookupPage() {
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const copy = getGuestOrderTrackingCopy(locale);
  const [orderNumber, setOrderNumber] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<GuestPublicOrder | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const response = await fetch("/api/orders/guest/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), guestEmail: guestEmail.trim() }),
      });
      const data = await parseApiResponse<LookupResponse>(response);

      if (data.trackingToken) {
        router.push(`/orders/track/${data.trackingToken}`);
        return;
      }

      setOrder(data.order);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : copy.notFound);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuestOrderTrackingShell title={copy.lookupTitle} subtitle={copy.lookupSubtitle}>
      {!order ? (
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="orderNumber" className="block text-sm font-semibold text-slate-700">
                {copy.orderNumber}
              </label>
              <input
                id="orderNumber"
                name="orderNumber"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
                placeholder="OM-XXXXXXXXXX"
                required
              />
            </div>
            <div>
              <label htmlFor="guestEmail" className="block text-sm font-semibold text-slate-700">
                {copy.email}
              </label>
              <input
                id="guestEmail"
                name="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
                required
              />
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? copy.searching : copy.findOrder}
          </button>

          <p className="mt-4 text-sm text-slate-500">{copy.lookupHelp}</p>
          <p className="mt-3 text-center text-sm text-slate-500">
            <Link href="/help" className="font-medium text-[#0f3460] hover:underline">
              Help Center
            </Link>
          </p>
        </form>
      ) : (
        <GuestOrderTrackingView order={order} />
      )}
    </GuestOrderTrackingShell>
  );
}
