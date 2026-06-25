"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CreditCard, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";

import { CheckoutStripeProvider } from "@/components/checkout/CheckoutStripeProvider";
import {
  getStripeCheckoutLoadErrorMessage,
  getStripeKeyMode,
} from "@/lib/stripe/checkout-client";
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
  clientSecret,
  onPaid,
  onRetry,
}: {
  requestId: string;
  clientSecret: string;
  onPaid: () => void;
  onRetry: () => void;
}) {
  const locale = useLocale();
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [paymentElementReady, setPaymentElementReady] = useState(false);
  const [paymentElementError, setPaymentElementError] = useState<string | null>(null);
  const publishableKeyMode = getStripeKeyMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  useEffect(() => {
    setPaymentElementReady(false);
    setPaymentElementError(null);
  }, [clientSecret]);

  const handlePay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !paymentElementReady) return;

    setPaying(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message ?? "Please check your card details.");
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/account/gift-requests`,
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
      {paymentElementError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-3">
          <p>{paymentElementError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-semibold text-[#0f3460] underline hover:no-underline"
          >
            Reload card form
          </button>
        </div>
      ) : null}
      <div className="rounded-xl border border-neutral-200 p-4">
        <PaymentElement
          key={clientSecret}
          options={{ layout: "tabs" }}
          onLoadError={(event) => {
            const message = getStripeCheckoutLoadErrorMessage(
              event.error?.message,
              publishableKeyMode
            );
            setPaymentElementError(message);
            setPaymentElementReady(false);
            toast.error(message);
          }}
          onReady={() => {
            setPaymentElementError(null);
            setPaymentElementReady(true);
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!stripe || !elements || !paymentElementReady || paying}
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
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentIntentData | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);

  const loadIntent = async () => {
    if (!isStripeCheckoutConfigured()) return;

    setLoading(true);
    setIntentError(null);
    try {
      const response = await fetchWithAuth(
        `/api/customer/gift-requests/${requestId}/payment/intent`,
        { method: "POST" }
      );
      const data = await parseApiResponse<PaymentIntentData>(response);
      setPayment(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start payment";
      setIntentError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isStripeCheckoutConfigured()) return;

    void getStripePromise();
    void loadIntent();
  }, [requestId]);

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
      ) : intentError ? (
        <div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{intentError}</p>
          <button
            type="button"
            onClick={() => void loadIntent()}
            className="text-sm font-semibold text-[#0f3460] underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      ) : payment?.clientSecret ? (
        <div className="mt-4 rounded-xl border border-white/80 bg-white p-4">
          <CheckoutStripeProvider clientSecret={payment.clientSecret} locale={locale}>
            <GiftRequestStripePaymentForm
              requestId={requestId}
              clientSecret={payment.clientSecret}
              onPaid={onPaid}
              onRetry={() => void loadIntent()}
            />
          </CheckoutStripeProvider>
        </div>
      ) : null}
    </section>
  );
}
