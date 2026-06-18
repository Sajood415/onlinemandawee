"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AdminRefundDecisionForm } from "@/components/refunds/AdminRefundDecisionForm";
import { DisputeChatPanel } from "@/components/refunds/DisputeChatPanel";
import { RefundEvidenceList } from "@/components/refunds/RefundEvidenceList";
import { RefundStatusBadge } from "@/components/refunds/RefundStatusBadge";
import { VendorRefundResponseForm } from "@/components/refunds/VendorRefundResponseForm";
import type { RefundCaseDetail } from "@/components/refunds/refund-types";
import {
  formatRefundDate,
  formatRefundMoney,
} from "@/components/refunds/format-refund-money";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type RefundCaseDetailViewProps = {
  refundCaseId: string;
  locale: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  backHref: string;
  backLabel: string;
};

export function RefundCaseDetailView({
  refundCaseId,
  locale,
  role,
  backHref,
  backLabel,
}: RefundCaseDetailViewProps) {
  const [refundCase, setRefundCase] = useState<RefundCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);

  const loadCase = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/refunds/${refundCaseId}`);
      const data = await parseApiResponse<RefundCaseDetail>(response);
      setRefundCase(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dispute");
    } finally {
      setLoading(false);
    }
  }, [refundCaseId]);

  useEffect(() => {
    void loadCase();
  }, [loadCase]);

  const handleEscalate = async () => {
    setEscalating(true);
    try {
      await fetchWithAuth(`/api/refunds/${refundCaseId}/escalate`, { method: "POST" });
      toast.success("Case escalated to admin");
      await loadCase();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to escalate");
    } finally {
      setEscalating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!refundCase) {
    return <p className="py-8 text-sm text-neutral-500">Dispute not found.</p>;
  }

  const canEscalate =
    role === "CUSTOMER" &&
    refundCase.status !== "RESOLVED" &&
    refundCase.status !== "ESCALATED_ADMIN";

  const showVendorForm = role === "VENDOR" && refundCase.status === "WAITING_VENDOR";
  const showAdminForm =
    role === "ADMIN" && refundCase.status !== "RESOLVED" && !refundCase.decision;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Order {refundCase.order.orderNumber}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-neutral-900">
              {refundCase.orderItem.productName}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">{refundCase.reason}</p>
          </div>
          <RefundStatusBadge status={refundCase.status} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-neutral-50 p-4 text-sm">
            <p className="font-semibold text-neutral-900">Amounts</p>
            <p className="mt-2 text-neutral-700">
              Requested:{" "}
              {formatRefundMoney(
                refundCase.requestedAmount,
                refundCase.order.currency,
                locale
              )}
            </p>
            {refundCase.decision ? (
              <p className="mt-1 text-neutral-700">
                Approved:{" "}
                {formatRefundMoney(
                  refundCase.decision.approvedAmount,
                  refundCase.order.currency,
                  locale
                )}{" "}
                ({refundCase.decision.decisionType})
              </p>
            ) : null}
          </div>

          <div className="rounded-lg bg-neutral-50 p-4 text-sm">
            <p className="font-semibold text-neutral-900">Timeline</p>
            <p className="mt-2 text-neutral-700">
              Opened: {formatRefundDate(refundCase.createdAt, locale)}
            </p>
            {refundCase.vendorResponseDueAt ? (
              <p className="mt-1 text-neutral-700">
                Vendor due: {formatRefundDate(refundCase.vendorResponseDueAt, locale)}
              </p>
            ) : null}
            {refundCase.escalatedAt ? (
              <p className="mt-1 text-neutral-700">
                Escalated: {formatRefundDate(refundCase.escalatedAt, locale)}
              </p>
            ) : null}
            {refundCase.finalDecisionAt ? (
              <p className="mt-1 text-neutral-700">
                Resolved: {formatRefundDate(refundCase.finalDecisionAt, locale)}
              </p>
            ) : null}
          </div>
        </div>

        {refundCase.description ? (
          <div className="mt-4 rounded-lg border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Customer description
            </p>
            <p className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">
              {refundCase.description}
            </p>
          </div>
        ) : null}

        {refundCase.vendorExplanation ? (
          <div className="mt-4 rounded-lg border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Vendor explanation
            </p>
            <p className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">
              {refundCase.vendorExplanation}
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 p-4 text-sm">
            <p className="font-semibold text-neutral-900">Customer</p>
            <p className="mt-2">{refundCase.customer.fullName}</p>
            <p className="text-neutral-600">{refundCase.customer.email}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4 text-sm">
            <p className="font-semibold text-neutral-900">Vendor</p>
            <p className="mt-2">{refundCase.vendor.storeName ?? "Store"}</p>
            <p className="text-neutral-600">{refundCase.vendor.user.email}</p>
            {role === "ADMIN" ? (
              <Link
                href={`/admin/vendors/${refundCase.vendor.vendorProfileId}`}
                className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
              >
                View vendor profile
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-neutral-900">Evidence</p>
          <RefundEvidenceList evidences={refundCase.evidences} locale={locale} />
        </div>

        {canEscalate ? (
          <button
            type="button"
            onClick={() => void handleEscalate()}
            disabled={escalating}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
          >
            {escalating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Escalate to admin
          </button>
        ) : null}
      </div>

      {showVendorForm ? (
        <VendorRefundResponseForm refundCaseId={refundCase.id} onSuccess={() => void loadCase()} />
      ) : null}

      {showAdminForm ? (
        <AdminRefundDecisionForm refundCase={refundCase} onSuccess={() => void loadCase()} />
      ) : null}

      <DisputeChatPanel
        refundCaseId={refundCase.id}
        locale={locale}
        onCaseUpdated={() => void loadCase()}
      />
    </div>
  );
}
