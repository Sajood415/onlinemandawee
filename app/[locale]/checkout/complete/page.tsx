"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { confirmCheckoutOrderWithRetry } from "@/lib/checkout/client-checkout-confirmation";
import { getStripePromise } from "@/lib/stripe/client";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";

const CHECKOUT_PENDING_STORAGE_KEY = "checkout-pending-confirmations";

type PendingCheckoutConfirmation = {
  checkoutApiBase: string;
  useAuthCheckout: boolean;
  payload: {
    paymentIntentId: string;
    checkoutContextToken: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    addressLine1?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    deliveryMethod: "PICKUP" | "EXPRESS" | "STANDARD";
    currency: string;
    items: Array<{ productId: string; quantity: number }>;
    vendorCoupons: Array<{ code: string; vendorProfileId: string }>;
  };
};

type CompletionState =
  | { type: "loading"; message: string }
  | { type: "error"; message: string }
  | {
      type: "success";
      orderNumber: string;
      destinationHref: string;
      destinationLabel: string;
    };

function readPendingConfirmation(paymentIntentId: string) {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(CHECKOUT_PENDING_STORAGE_KEY);
  if (!raw) return null;
  const records = JSON.parse(raw) as Record<string, PendingCheckoutConfirmation>;
  return records[paymentIntentId] ?? null;
}

function clearPendingConfirmation(paymentIntentId: string) {
  if (typeof window === "undefined") return;
  const raw = window.sessionStorage.getItem(CHECKOUT_PENDING_STORAGE_KEY);
  if (!raw) return;
  const records = JSON.parse(raw) as Record<string, PendingCheckoutConfirmation>;
  delete records[paymentIntentId];
  window.sessionStorage.setItem(CHECKOUT_PENDING_STORAGE_KEY, JSON.stringify(records));
}

async function postCheckout(
  path: string,
  body: unknown,
  useAuth: boolean
) {
  if (useAuth) {
    return fetchWithAuth(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postCheckoutConfirm(
  pending: PendingCheckoutConfirmation
): Promise<{ orderNumber: string; guestTrackingToken?: string | null }> {
  return confirmCheckoutOrderWithRetry({
    confirmPath: `${pending.checkoutApiBase}/confirm`,
    payload: pending.payload,
    useAuthCheckout: pending.useAuthCheckout,
    postCheckout,
  });
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={<CheckoutCompleteLoadingState message="Finalizing your payment..." />}>
      <CheckoutCompletePageContent />
    </Suspense>
  );
}

function CheckoutCompleteLoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0f3460]" />
        <p className="mt-3 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}

function CheckoutCompletePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CompletionState>({
    type: "loading",
    message: "Finalizing your payment...",
  });

  useEffect(() => {
    let cancelled = false;

    const finalize = async () => {
      const clientSecret = searchParams.get("payment_intent_client_secret");
      if (!clientSecret) {
        setState({
          type: "error",
          message: "Missing payment context. Please return to checkout and try again.",
        });
        return;
      }

      const stripe = await getStripePromise();
      if (!stripe) {
        setState({
          type: "error",
          message: "Stripe is not configured. Please contact support.",
        });
        return;
      }

      const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
      if (error || !paymentIntent) {
        setState({
          type: "error",
          message: error?.message ?? "Could not retrieve payment details.",
        });
        return;
      }

      if (paymentIntent.status !== "succeeded") {
        setState({
          type: "error",
          message:
            paymentIntent.status === "processing"
              ? "Payment is still processing. Please refresh this page in a moment."
              : "Payment is not completed yet. Please return to checkout.",
        });
        return;
      }

      const pending = readPendingConfirmation(paymentIntent.id);
      if (!pending) {
        setState({
          type: "success",
          orderNumber: "Payment received",
          destinationHref: "/orders",
          destinationLabel: "Track order",
        });
        return;
      }

      try {
        const confirmed = await postCheckoutConfirm(pending);
        clearPendingConfirmation(paymentIntent.id);
        localStorage.removeItem("onlinemandawee-cart");

        const destinationHref =
          pending.useAuthCheckout
            ? "/account"
            : confirmed.guestTrackingToken
              ? `/orders/track/${confirmed.guestTrackingToken}`
              : "/orders";

        const destinationLabel = pending.useAuthCheckout
          ? "View my orders"
          : "Track order";

        if (cancelled) return;
        setState({
          type: "success",
          orderNumber: confirmed.orderNumber,
          destinationHref,
          destinationLabel,
        });
        router.replace(destinationHref);
      } catch (confirmError) {
        if (cancelled) return;
        setState({
          type: "error",
          message:
            confirmError instanceof Error
              ? confirmError.message
              : "Could not finalize your order.",
        });
      }
    };

    void finalize();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (state.type === "loading") {
    return <CheckoutCompleteLoadingState message={state.message} />;
  }

  if (state.type === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-lg font-bold text-red-800">Checkout could not be completed</h1>
          <p className="mt-2 text-sm text-red-700">{state.message}</p>
          <Link
            href="/checkout"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
          >
            Return to checkout
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <h1 className="text-lg font-bold text-green-800">Payment completed</h1>
        <p className="mt-2 text-sm text-green-700">
          Your order has been recorded: <span className="font-semibold">{state.orderNumber}</span>
        </p>
        <Link
          href={state.destinationHref}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#0f3460] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
        >
          {state.destinationLabel}
        </Link>
      </div>
    </div>
  );
}
