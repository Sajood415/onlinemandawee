"use client";

import { AlertTriangle, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";

import { parseApiResponse } from "@/lib/http/parse-api-response";
import {
  formatMembershipFee,
  formatMembershipGracePeriodLabel,
} from "@/lib/membership/subscription-policy";
import { Link } from "@/i18n/navigation";

type SubscriptionStatus = {
  monthlyAmount: number;
  currency: string;
  trialEndsAt: string;
  isInTrial: boolean;
  alertLevel: "none" | "warning" | "critical" | "suspended";
  shopSuspendedForBilling: boolean;
  gracePeriodEndsAt: string | null;
  failedPaymentCount: number;
};

export function SubscriptionBillingBanner() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    void (async () => {
      try {
        const res = await fetch("/api/vendor/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await parseApiResponse<SubscriptionStatus>(res);
        setStatus(data);
      } catch {
        // Non-blocking banner
      }
    })();
  }, []);

  if (!status || status.alertLevel === "none") {
    return null;
  }

  const feeLabel = formatMembershipFee(status.monthlyAmount, status.currency);
  const graceLabel = formatMembershipGracePeriodLabel();
  const graceDeadline = status.gracePeriodEndsAt
    ? new Date(status.gracePeriodEndsAt).toLocaleDateString()
    : null;

  if (status.alertLevel === "suspended" || status.shopSuspendedForBilling) {
    return (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Shop suspended — unpaid membership</p>
            <p className="mt-1 text-red-800">
              Your store is hidden from customers because membership payment was not
              completed within the {graceLabel} grace period ({feeLabel}/month after the
              3-month free trial). Update your billing card and complete payment to restore
              your shop.
            </p>
            <Link
              href="/vendor/settings"
              className="mt-2 inline-block font-medium text-red-900 underline"
            >
              Update billing card in settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCritical = status.alertLevel === "critical";

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        isCritical
          ? "border-orange-300 bg-orange-50 text-orange-950"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <div className="flex items-start gap-3">
        {isCritical ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
        ) : (
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div>
          <p className="font-semibold">
            {isCritical
              ? "Membership payment failed"
              : "Membership payment reminder"}
          </p>
          <p className="mt-1">
            {isCritical
              ? `We could not charge your membership (${feeLabel}/month). You have ${graceLabel} to update your card and complete payment${
                  graceDeadline ? ` (until ${graceDeadline})` : ""
                }. Failed attempts: ${status.failedPaymentCount}.`
              : `Please keep your billing card up to date for membership charges (${feeLabel}/month after your free trial).`}
          </p>
          <Link
            href="/vendor/settings"
            className="mt-2 inline-block font-medium underline"
          >
            Manage billing card
          </Link>
        </div>
      </div>
    </div>
  );
}
