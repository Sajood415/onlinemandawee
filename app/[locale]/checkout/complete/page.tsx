"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { CheckCircle, ChevronRight, Loader2 } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { confirmCheckoutOrderWithRetry } from "@/lib/checkout/client-checkout-confirmation";
import { useCheckoutCopy } from "@/lib/i18n/use-checkout-copy";
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

async function postCheckout(path: string, body: unknown, useAuth: boolean) {
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
  const copy = useCheckoutCopy();

  return (
    <Suspense
      fallback={<CheckoutCompleteShell copy={copy}><CompleteLoading message={copy.complete.finalizing} /></CheckoutCompleteShell>}
    >
      <CheckoutCompletePageContent />
    </Suspense>
  );
}

function CheckoutCompleteShell({
  copy,
  children,
}: {
  copy: ReturnType<typeof useCheckoutCopy>;
  children: ReactNode;
}) {
  const locale = useLocale();
  const isRtl = locale !== "en";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-6 lg:py-14">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-neutral-400"
        >
          <Link href="/" className="transition hover:text-[#0F3460] hover:underline">
            {copy.home}
          </Link>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
          <Link href="/checkout" className="transition hover:text-[#0F3460] hover:underline">
            {copy.title}
          </Link>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
          <span className="text-neutral-800">{copy.complete.successTitle}</span>
        </nav>
        {children}
      </div>
    </div>
  );
}

function CompleteLoading({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center border border-neutral-200 px-6 py-16 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#0F3460]/40" />
      <p className="mt-4 text-sm text-neutral-600">{message}</p>
    </div>
  );
}

function CheckoutCompletePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = useCheckoutCopy();
  const [state, setState] = useState<CompletionState>({
    type: "loading",
    message: copy.complete.finalizing,
  });

  useEffect(() => {
    let cancelled = false;

    const finalize = async () => {
      const clientSecret = searchParams.get("payment_intent_client_secret");
      if (!clientSecret) {
        setState({ type: "error", message: copy.complete.missingContext });
        return;
      }

      const stripe = await getStripePromise();
      if (!stripe) {
        setState({ type: "error", message: copy.complete.stripeMissing });
        return;
      }

      const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
      if (error || !paymentIntent) {
        setState({
          type: "error",
          message: error?.message ?? copy.complete.retrieveFailed,
        });
        return;
      }

      if (paymentIntent.status !== "succeeded") {
        setState({
          type: "error",
          message:
            paymentIntent.status === "processing"
              ? copy.complete.stillProcessing
              : copy.complete.notCompleted,
        });
        return;
      }

      const pending = readPendingConfirmation(paymentIntent.id);
      if (!pending) {
        setState({
          type: "success",
          orderNumber: copy.complete.paymentReceived,
          destinationHref: "/orders",
          destinationLabel: copy.complete.trackOrder,
        });
        return;
      }

      try {
        const confirmed = await postCheckoutConfirm(pending);
        clearPendingConfirmation(paymentIntent.id);
        localStorage.removeItem("onlinemandawee-cart");

        const destinationHref = pending.useAuthCheckout
          ? "/account"
          : confirmed.guestTrackingToken
            ? `/orders/track/${confirmed.guestTrackingToken}`
            : "/orders";

        const destinationLabel = pending.useAuthCheckout
          ? copy.complete.viewOrders
          : copy.complete.trackOrder;

        if (cancelled) return;
        setState({
          type: "success",
          orderNumber: confirmed.orderNumber,
          destinationHref,
          destinationLabel,
        });
        // Keep user on confirmation briefly — don't auto-redirect away
      } catch (confirmError) {
        if (cancelled) return;
        setState({
          type: "error",
          message:
            confirmError instanceof Error
              ? confirmError.message
              : copy.complete.finalizeFailed,
        });
      }
    };

    void finalize();
    return () => {
      cancelled = true;
    };
  }, [copy.complete, router, searchParams]);

  return (
    <CheckoutCompleteShell copy={copy}>
      {state.type === "loading" ? (
        <CompleteLoading message={state.message} />
      ) : state.type === "error" ? (
        <div className="border border-neutral-200 px-6 py-12 text-center sm:px-8">
          <h1 className="text-xl font-bold text-neutral-900">{copy.complete.errorTitle}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">{state.message}</p>
          <Link
            href="/checkout"
            className="mt-6 inline-flex bg-[#0F3460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
          >
            {copy.complete.returnCheckout}
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-200 px-6 py-12 text-center sm:px-8">
          <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" strokeWidth={1.5} />
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">{copy.complete.successTitle}</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {copy.complete.successBody.replace("{orderNumber}", state.orderNumber)}
          </p>
          <p className="mt-4 text-lg font-bold text-[#0F3460]">{state.orderNumber}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={state.destinationHref}
              className="inline-flex bg-[#0F3460] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a2540]"
            >
              {state.destinationLabel}
            </Link>
            <Link
              href="/"
              className="inline-flex border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-neutral-400"
            >
              {copy.success.continueShopping}
            </Link>
          </div>
        </div>
      )}
    </CheckoutCompleteShell>
  );
}
