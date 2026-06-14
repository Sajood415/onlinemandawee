"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CreditCard, Loader2 } from "lucide-react";

import { getStripePromise, isStripeCheckoutConfigured } from "@/lib/stripe/client";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type GiftRequestQuotePaymentProps = {
  requestId: string;
  requestNumber: string;
  quoteAmountMinor: number;
  quoteCurrency: string;
  quoteNote: string | null;
  quoteImageUrl: string | null;
  onPaid: () => void;
};

type PaymentIntentData = {
  clientSecret: string;
  paymentIntentId: string;
  quoteAmountMinor: number;
  quoteCurrency: string;
};

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100);
}

function GiftRequestStripePaymentForm({
  requestId,
  payment,
  onPaid,
}: {
  requestId: string;
  payment: PaymentIntentData;
  onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account/gift-requests`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message ?? "Payment failed. Please try again.");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        const response = await fetchWithAuth(
          `/api/customer/gift-requests/${requestId}/payment/confirm`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          }
        );
        await parseApiResponse(response);
        toast.success("Payment received. Thank you!");
        onPaid();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment could not be completed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={(event) => void handlePay(event)} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || paying}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540] disabled:opacity-60 sm:w-auto"
      >
        {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {paying ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
}

export function GiftRequestQuotePayment({
  requestId,
  requestNumber,
  quoteAmountMinor,
  quoteCurrency,
  quoteNote,
  quoteImageUrl,
  onPaid,
}: GiftRequestQuotePaymentProps) {
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentIntentData | null>(null);
  const stripePromise = useMemo(() => getStripePromise(), []);

  useEffect(() => {
    if (!isStripeCheckoutConfigured()) return;

    let cancelled = false;
    const loadIntent = async () => {
      setLoading(true);
      try {
        const response = await fetchWithAuth(
          `/api/customer/gift-requests/${requestId}/payment/intent`,
          { method: "POST" }
        );
        const data = await parseApiResponse<PaymentIntentData>(response);
        if (!cancelled) setPayment(data);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Could not start payment");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadIntent();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const stripeOptions = payment?.clientSecret
    ? { clientSecret: payment.clientSecret }
    : undefined;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-900">Quote ready — payment required</h3>
      <p className="mt-1 text-sm text-amber-800">
        {requestNumber} · {formatMoney(quoteAmountMinor, quoteCurrency)}
      </p>

      {quoteImageUrl ? (
        <div className="relative mt-4 aspect-[4/3] max-w-sm overflow-hidden rounded-xl border border-amber-200 bg-white">
          <Image
            src={quoteImageUrl}
            alt="Gift preview"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 320px"
          />
        </div>
      ) : null}

      {quoteNote ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
          {quoteNote}
        </p>
      ) : null}

      {!isStripeCheckoutConfigured() ? (
        <p className="mt-4 text-sm text-amber-900">
          Online payment is not available right now. Please contact support to complete payment.
        </p>
      ) : loading ? (
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-amber-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing secure checkout...
        </div>
      ) : payment && stripeOptions && stripePromise ? (
        <div className="mt-4 rounded-xl border border-white/80 bg-white p-4">
          <Elements stripe={stripePromise} options={stripeOptions}>
            <GiftRequestStripePaymentForm
              requestId={requestId}
              payment={payment}
              onPaid={onPaid}
            />
          </Elements>
        </div>
      ) : null}
    </section>
  );
}
