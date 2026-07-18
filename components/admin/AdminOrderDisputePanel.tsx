"use client";

import { useState } from "react";
import { Flag, Loader2, RotateCcw } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type RefundCaseSummary = {
  id: string;
  orderItemId: string;
  status: string;
  reason: string;
  requestedAmount: number;
  createdAt: string;
  decision: {
    decisionType: string;
    approvedAmount: number;
    reason: string | null;
  } | null;
};

type Props = {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  currency: string;
  refundCases: RefundCaseSummary[];
  onUpdated: () => void;
};

const INPUT =
  "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

export function AdminOrderDisputePanel({
  orderId,
  orderNumber,
  paymentStatus,
  currency,
  refundCases,
  onUpdated,
}: Props) {
  const [flagNote, setFlagNote] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const openCases = refundCases.filter((refundCase) => refundCase.status !== "RESOLVED");
  const canRefund =
    paymentStatus === "PAID" || paymentStatus === "PARTIALLY_REFUNDED";

  const onFlag = async () => {
    if (flagNote.trim().length < 3) {
      toast.error("Note required", "Add a short note explaining why this needs review.");
      return;
    }

    setFlagging(true);
    try {
      const res = await fetchWithAuth(`/api/admin/orders/${orderId}/flag-dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: flagNote.trim() }),
      });
      await parseApiResponse(res);
      toast.success(
        "Order flagged",
        openCases.length > 0
          ? "Open dispute cases were escalated to admin review."
          : "Dispute flag recorded for this order."
      );
      setFlagNote("");
      onUpdated();
    } catch (error) {
      toast.error(
        "Could not flag order",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setFlagging(false);
    }
  };

  const onMarkRefunded = async () => {
    if (refundReason.trim().length < 3) {
      toast.error("Reason required", "Explain why this order is being refunded.");
      return;
    }

    if (
      !window.confirm(
        `Mark order ${orderNumber} as refunded? This records an admin dispute intervention and updates vendor payouts.`
      )
    ) {
      return;
    }

    setRefunding(true);
    try {
      const res = await fetchWithAuth(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason.trim() }),
      });
      const result = await parseApiResponse<{ paymentStatus: string }>(res);
      toast.success(
        "Order marked refunded",
        `Payment status is now ${result.paymentStatus.replaceAll("_", " ").toLowerCase()}.`
      );
      setRefundReason("");
      onUpdated();
    } catch (error) {
      toast.error(
        "Could not mark refunded",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setRefunding(false);
    }
  };

  return (
    <section className="rounded-xl border border-neutral-200 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Disputes & refunds</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Vendors handle most refunds. Use this only when admin needs to step in.
      </p>

      {refundCases.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {refundCases.map((refundCase) => (
            <li
              key={refundCase.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-900">{refundCase.reason}</p>
                <p className="text-xs text-neutral-500">
                  {formatMoney(refundCase.requestedAmount, currency)} ·{" "}
                  {refundCase.status.replaceAll("_", " ")}
                </p>
              </div>
              <Link
                href={`/admin/disputes/${refundCase.id}`}
                className="text-xs font-semibold text-[#0F3460] hover:underline"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">No refund cases yet.</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-neutral-500">
            Flag for review
          </label>
          <textarea
            rows={2}
            className={INPUT}
            placeholder="Why does this need attention?"
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            maxLength={1000}
          />
          <button
            type="button"
            disabled={flagging}
            onClick={() => void onFlag()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            {flagging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Flag className="h-4 w-4" />
            )}
            Flag order
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-neutral-500">
            Mark refunded
          </label>
          <textarea
            rows={2}
            className={INPUT}
            placeholder="Reason for admin refund"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            maxLength={1000}
            disabled={!canRefund}
          />
          <button
            type="button"
            disabled={refunding || !canRefund}
            onClick={() => void onMarkRefunded()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F3460] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
          >
            {refunding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Mark refunded
          </button>
          {!canRefund ? (
            <p className="text-xs text-neutral-500">
              Only paid or partially refunded orders can use this.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
