"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Elements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";

import {
  getStripeKeyMode,
  isValidPaymentIntentClientSecret,
} from "@/lib/stripe/checkout-client";
import { ensureStripeLoaded, getStripeCheckoutLocale } from "@/lib/stripe/client";

type CheckoutStripeProviderProps = {
  clientSecret: string;
  locale: string;
  children: ReactNode;
};

export function CheckoutStripeProvider({
  clientSecret,
  locale,
  children,
}: CheckoutStripeProviderProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishableKeyMode = useMemo(
    () => getStripeKeyMode(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    []
  );

  useEffect(() => {
    let cancelled = false;

    if (!isValidPaymentIntentClientSecret(clientSecret)) {
      setError("Invalid payment session. Please refresh pricing and try again.");
      setReady(false);
      setStripe(null);
      return;
    }

    setReady(false);
    setError(null);

    void ensureStripeLoaded()
      .then((loadedStripe) => {
        if (!cancelled) {
          setStripe(loadedStripe);
          setReady(true);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setStripe(null);
          setReady(false);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Stripe could not be loaded. Please refresh and try again."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientSecret]);

  const options = useMemo(
    () => ({
      clientSecret,
      locale: getStripeCheckoutLocale(locale),
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#0f3460",
          borderRadius: "12px",
        },
      },
    }),
    [clientSecret, locale]
  );

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
        {publishableKeyMode === "unknown" ? (
          <p className="mt-2 text-xs text-red-700">
            Check that NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set in .env.local and restart the dev
            server.
          </p>
        ) : null}
      </div>
    );
  }

  if (!ready || !stripe) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading secure card form…
      </div>
    );
  }

  return (
    <Elements key={clientSecret} stripe={stripe} options={options}>
      {children}
    </Elements>
  );
}
