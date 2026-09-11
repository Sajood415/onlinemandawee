"use client";

import {
  PayPalCardFieldsProvider,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalCardFields,
  PayPalScriptProvider,
} from "@paypal/react-paypal-js";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import {
  getPayPalClientId,
  getPayPalSdkCurrency,
  isPayPalCheckoutConfigured,
} from "@/lib/paypal/client";
import { toast } from "@/lib/utils/toast";

type CheckoutPayPalCardFormProps = {
  currency: string;
  createOrder: () => Promise<string>;
  onApprove: (paypalOrderId: string) => Promise<void>;
  disabled?: boolean;
  payLabel: string;
};

function SubmitPayPalCardButton({
  payLabel,
  disabled,
}: {
  payLabel: string;
  disabled?: boolean;
}) {
  const { cardFieldsForm } = usePayPalCardFields();
  const [paying, setPaying] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled || paying || !cardFieldsForm}
      onClick={() => {
        if (!cardFieldsForm) return;
        setPaying(true);
        void cardFieldsForm
          .submit()
          .catch((error: unknown) => {
            toast.error(
              error instanceof Error ? error.message : "PayPal payment failed"
            );
          })
          .finally(() => setPaying(false));
      }}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
    >
      {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {payLabel}
    </button>
  );
}

export function CheckoutPayPalCardForm({
  currency,
  createOrder,
  onApprove,
  disabled,
  payLabel,
}: CheckoutPayPalCardFormProps) {
  if (!isPayPalCheckoutConfigured()) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        PayPal is not configured.
      </p>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: getPayPalClientId(),
        components: "card-fields",
        currency: getPayPalSdkCurrency(currency),
        intent: "capture",
      }}
    >
      <PayPalCardFieldsProvider
        createOrder={async () => createOrder()}
        onApprove={async (data) => {
          if (!data.orderID) {
            toast.error("PayPal payment did not complete");
            return;
          }
          await onApprove(data.orderID);
        }}
        onError={(err) => {
          toast.error(err instanceof Error ? err.message : "PayPal error");
        }}
      >
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
          <PayPalNameField />
          <PayPalNumberField />
          <div className="grid gap-3 sm:grid-cols-2">
            <PayPalExpiryField />
            <PayPalCVVField />
          </div>
          <SubmitPayPalCardButton payLabel={payLabel} disabled={disabled} />
        </div>
      </PayPalCardFieldsProvider>
    </PayPalScriptProvider>
  );
}
