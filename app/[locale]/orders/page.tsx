"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "next-intl";
import { Loader2, Search } from "lucide-react";

import { GuestOrderTrackingShell } from "@/components/orders/GuestOrderTrackingShell";
import { GuestOrderTrackingView } from "@/components/orders/GuestOrderTrackingView";
import { getGuestOrderTrackingCopy } from "@/components/orders/guest-order-tracking-copy";
import { Link, useRouter } from "@/i18n/navigation";
import type { GuestPublicOrder } from "@/lib/orders/guest-public-order-types";
import type { SupportedLocale } from "@/lib/localization/product-vendor";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type LookupResponse = {
  order: GuestPublicOrder;
  trackingToken: string | null;
};

const LABEL_CLASS = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500";
const ERROR_CLASS = "mt-1.5 text-xs text-red-600";

function fieldClassName(hasError = false) {
  return `w-full border-0 border-b bg-transparent px-0 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 ${
    hasError
      ? "border-red-400 focus:border-red-500"
      : "border-neutral-300 focus:border-[#0F3460]"
  }`;
}

export default function OrdersLookupPage() {
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const copy = getGuestOrderTrackingCopy(locale);
  const [orderNumber, setOrderNumber] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ orderNumber?: string; guestEmail?: string }>(
    {}
  );
  const [order, setOrder] = useState<GuestPublicOrder | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextFieldErrors: { orderNumber?: string; guestEmail?: string } = {};
    if (!orderNumber.trim()) nextFieldErrors.orderNumber = copy.orderNumber;
    if (!guestEmail.trim()) nextFieldErrors.guestEmail = copy.email;
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

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
          noValidate
          className="bg-white px-5 py-7 shadow-[0_20px_50px_-28px_rgba(15,52,96,0.35)] sm:px-8 sm:py-9"
        >
          <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0F3460]">
                {copy.formBadge}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
                {copy.formTitle}
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              <span className="text-red-500">*</span> {copy.required}
            </p>
          </div>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-neutral-600">
            {copy.formSubtitle}
          </p>

          <section className="border-t border-neutral-200 pt-7">
            <h3 className="mb-5 text-sm font-semibold text-neutral-900">{copy.sectionDetails}</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div data-field-error={fieldErrors.orderNumber ? "true" : undefined}>
                <label htmlFor="orderNumber" className={LABEL_CLASS}>
                  {copy.orderNumber}
                  <span className="ms-0.5 text-red-500">*</span>
                </label>
                <input
                  id="orderNumber"
                  name="orderNumber"
                  value={orderNumber}
                  onChange={(event) => {
                    setOrderNumber(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, orderNumber: undefined }));
                    setError(null);
                  }}
                  className={fieldClassName(Boolean(fieldErrors.orderNumber))}
                  placeholder={copy.orderNumberPlaceholder}
                  autoComplete="off"
                  required
                />
                {fieldErrors.orderNumber ? (
                  <p className={ERROR_CLASS}>{fieldErrors.orderNumber}</p>
                ) : null}
              </div>

              <div data-field-error={fieldErrors.guestEmail ? "true" : undefined}>
                <label htmlFor="guestEmail" className={LABEL_CLASS}>
                  {copy.email}
                  <span className="ms-0.5 text-red-500">*</span>
                </label>
                <input
                  id="guestEmail"
                  name="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(event) => {
                    setGuestEmail(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, guestEmail: undefined }));
                    setError(null);
                  }}
                  className={fieldClassName(Boolean(fieldErrors.guestEmail))}
                  autoComplete="email"
                  required
                />
                {fieldErrors.guestEmail ? (
                  <p className={ERROR_CLASS}>{fieldErrors.guestEmail}</p>
                ) : null}
              </div>
            </div>
          </section>

          {error ? <p className={`${ERROR_CLASS} mt-5 text-sm`}>{error}</p> : null}

          <div className="mt-10 border-t border-neutral-200 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 bg-[#0F3460] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? copy.searching : copy.findOrder}
            </button>
            <p className="mt-4 text-sm text-neutral-500">{copy.lookupHelp}</p>
            <p className="mt-2 text-sm text-neutral-500">
              {copy.helpCenter}{" "}
              <Link
                href="/contact"
                className="font-semibold text-[#0F3460] underline-offset-2 hover:underline"
              >
                {copy.helpLink}
              </Link>
            </p>
          </div>
        </form>
      ) : (
        <GuestOrderTrackingView order={order} />
      )}
    </GuestOrderTrackingShell>
  );
}
