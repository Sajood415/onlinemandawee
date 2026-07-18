"use client";

import { AlertTriangle, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("VendorPages.billingBanner");
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
            <p className="font-semibold">{t("suspendedTitle")}</p>
            <p className="mt-1 text-red-800">
              {t("suspendedBody", { grace: graceLabel, fee: feeLabel })}
            </p>
            <Link
              href="/vendor/settings"
              className="mt-2 inline-block font-medium text-red-900 underline"
            >
              {t("updateBilling")}
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
            {isCritical ? t("failedTitle") : t("reminderTitle")}
          </p>
          <p className="mt-1">
            {isCritical
              ? t("failedBody", {
                  fee: feeLabel,
                  grace: graceLabel,
                  deadline: graceDeadline
                    ? t("deadlineUntil", { date: graceDeadline })
                    : "",
                  count: status.failedPaymentCount,
                })
              : t("reminderBody", { fee: feeLabel })}
          </p>
          <Link
            href="/vendor/settings"
            className="mt-2 inline-block font-medium underline"
          >
            {t("manageBilling")}
          </Link>
        </div>
      </div>
    </div>
  );
}
