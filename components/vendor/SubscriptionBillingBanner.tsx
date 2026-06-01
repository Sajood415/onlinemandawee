"use client";

import { AlertTriangle, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";

import { parseApiResponse } from "@/lib/http/parse-api-response";
import { formatMembershipFee } from "@/lib/membership/subscription-policy";
import { Link } from "@/i18n/navigation";

type SubscriptionStatus = {
  monthlyAmount: number;
  currency: string;
  trialEndsAt: string;
  isInTrial: boolean;
  overdueMonths: number;
  alertLevel: "none" | "warning" | "critical" | "suspended";
  shopSuspendedForBilling: boolean;
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

  if (status.alertLevel === "suspended" || status.shopSuspendedForBilling) {
    return (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Shop suspended — unpaid membership</p>
            <p className="mt-1 text-red-800">
              Your store is hidden from customers because membership is{" "}
              {status.overdueMonths}+ months overdue ({feeLabel}/month after the
              3-month free trial). Pay all outstanding invoices to restore your shop.
            </p>
            <Link
              href="/vendor/reports?tab=fees"
              className="mt-2 inline-block font-medium text-red-900 underline"
            >
              View fees &amp; subscription history
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
              ? "Final notice — membership payment"
              : "Membership payment overdue"}
          </p>
          <p className="mt-1">
            {isCritical
              ? `You have ${status.overdueMonths} unpaid membership month(s). Your shop will be suspended on the 4th unpaid month. Monthly fee: ${feeLabel}.`
              : `You have ${status.overdueMonths} unpaid month(s) (${feeLabel}/month after your free trial). Please pay soon to keep your shop active.`}
          </p>
          <Link
            href="/vendor/reports?tab=fees"
            className="mt-2 inline-block font-medium underline"
          >
            View fees &amp; subscription
          </Link>
        </div>
      </div>
    </div>
  );
}
