"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { AdminRefundDecisionEditor } from "@/components/refunds/AdminRefundDecisionEditor";
import { AdminRefundDecisionForm } from "@/components/refunds/AdminRefundDecisionForm";
import { AdminRefundStatusEditor } from "@/components/refunds/AdminRefundStatusEditor";
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
  const t = useTranslations("Disputes");
  const [refundCase, setRefundCase] = useState<RefundCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);

  const loadCase = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
      }
      try {
        const response = await fetchWithAuth(`/api/refunds/${refundCaseId}`);
        const data = await parseApiResponse<RefundCaseDetail>(response);
        setRefundCase(data);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("detail.loadError")
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [refundCaseId, t]
  );

  useEffect(() => {
    void loadCase();
  }, [loadCase]);

  const handleEscalate = async () => {
    setEscalating(true);
    try {
      await fetchWithAuth(`/api/refunds/${refundCaseId}/escalate`, {
        method: "POST",
      });
      toast.success(t("detail.escalateSuccess"));
      await loadCase();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("detail.escalateError")
      );
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
    return (
      <p className="py-8 text-sm text-neutral-500">{t("detail.notFound")}</p>
    );
  }

  const isOutsideVendor = refundCase.vendor.sellerType !== "PLATFORM";

  // Outside sellers: customer works with the vendor only. Mandawee shop: already with admin.
  const canEscalate =
    role === "CUSTOMER" &&
    !isOutsideVendor &&
    refundCase.status !== "RESOLVED" &&
    refundCase.status !== "ESCALATED_ADMIN";

  const showVendorForm =
    role === "VENDOR" &&
    refundCase.status === "WAITING_VENDOR" &&
    isOutsideVendor;
  const showAdminForm =
    role === "ADMIN" && refundCase.status !== "RESOLVED" && !refundCase.decision;
  const showRecordedDecision = Boolean(refundCase.decision) && !showAdminForm;

  const statusLabel = refundCase.decision
    ? t(`decisions.${refundCase.decision.decisionType}`)
    : t(`statuses.${refundCase.status}`);

  return (
    <div className="space-y-5 pb-16">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t("detail.orderLabel", {
                orderNumber: refundCase.order.orderNumber,
              })}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-primary">
              {refundCase.orderItem.productName}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">{refundCase.reason}</p>
          </div>
          {role === "ADMIN" ? (
            <div className="flex flex-col items-end gap-3">
              {refundCase.decision ? (
                <AdminRefundDecisionEditor
                  variant="inline"
                  refundCase={refundCase}
                  onSuccess={() => void loadCase({ silent: true })}
                />
              ) : null}
              <AdminRefundStatusEditor
                variant="inline"
                refundCase={refundCase}
                onSuccess={() => void loadCase({ silent: true })}
              />
            </div>
          ) : (
            <RefundStatusBadge
              status={refundCase.status}
              decision={refundCase.decision}
              label={statusLabel}
            />
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-neutral-50 p-4 text-sm">
            <p className="font-semibold text-neutral-900">{t("detail.amounts")}</p>
            <p className="mt-2 text-neutral-700">
              {t("detail.requested", {
                amount: formatRefundMoney(
                  refundCase.requestedAmount,
                  refundCase.order.currency,
                  locale
                ),
              })}
            </p>
            {refundCase.decision ? (
              <p className="mt-1 text-neutral-700">
                {t("detail.approved", {
                  amount: formatRefundMoney(
                    refundCase.decision.approvedAmount,
                    refundCase.order.currency,
                    locale
                  ),
                })}{" "}
                <span className="text-neutral-500">
                  ({t(`decisions.${refundCase.decision.decisionType}`)})
                </span>
              </p>
            ) : null}
          </div>

          <div className="rounded-xl bg-neutral-50 p-4 text-sm">
            <p className="font-semibold text-neutral-900">
              {t("detail.timeline")}
            </p>
            <p className="mt-2 text-neutral-700">
              {t("detail.opened", {
                date: formatRefundDate(refundCase.createdAt, locale),
              })}
            </p>
            {refundCase.vendorResponseDueAt ? (
              <p className="mt-1 text-neutral-700">
                {t("detail.vendorDue", {
                  date: formatRefundDate(
                    refundCase.vendorResponseDueAt,
                    locale
                  ),
                })}
              </p>
            ) : null}
            {refundCase.escalatedAt ? (
              <p className="mt-1 text-neutral-700">
                {t("detail.escalated", {
                  date: formatRefundDate(refundCase.escalatedAt, locale),
                })}
              </p>
            ) : null}
            {refundCase.finalDecisionAt ? (
              <p className="mt-1 text-neutral-700">
                {t("detail.resolved", {
                  date: formatRefundDate(refundCase.finalDecisionAt, locale),
                })}
              </p>
            ) : null}
          </div>
        </div>

        {refundCase.description ? (
          <div className="mt-4 rounded-xl border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t("detail.customerDescription")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
              {refundCase.description}
            </p>
          </div>
        ) : null}

        {refundCase.vendorExplanation ? (
          <div className="mt-4 rounded-xl border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t("detail.vendorExplanation")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
              {refundCase.vendorExplanation}
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 p-4 text-sm">
            <p className="font-semibold text-neutral-900">
              {t("detail.customer")}
            </p>
            <p className="mt-2">{refundCase.customer.fullName}</p>
            <p className="text-neutral-600">{refundCase.customer.email}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 p-4 text-sm">
            <p className="font-semibold text-neutral-900">{t("detail.vendor")}</p>
            <p className="mt-2">
              {refundCase.vendor.storeName ?? t("detail.storeFallback")}
            </p>
            <p className="text-neutral-600">{refundCase.vendor.user.email}</p>
            {role === "ADMIN" ? (
              <Link
                href={`/admin/vendors/${refundCase.vendor.vendorProfileId}`}
                className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
              >
                {t("detail.viewVendorProfile")}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-neutral-900">
            {t("detail.evidence")}
          </p>
          <RefundEvidenceList
            evidences={refundCase.evidences}
            locale={locale}
          />
        </div>

        {canEscalate ? (
          <button
            type="button"
            onClick={() => void handleEscalate()}
            disabled={escalating}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-orange-300 px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
          >
            {escalating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {escalating ? t("detail.escalating") : t("detail.escalate")}
          </button>
        ) : null}

        {role === "CUSTOMER" &&
        isOutsideVendor &&
        refundCase.status === "WAITING_VENDOR" ? (
          <p className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            {t("detail.contactVendorOnly")}
          </p>
        ) : null}
      </div>

      {showVendorForm ? (
        <VendorRefundResponseForm
          refundCaseId={refundCase.id}
          onSuccess={() => void loadCase()}
        />
      ) : null}

      {showAdminForm ? (
        <AdminRefundDecisionForm
          refundCase={refundCase}
          onSuccess={() => void loadCase()}
        />
      ) : null}

      {showRecordedDecision && role !== "ADMIN" ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800">
          <p className="font-semibold text-neutral-900">
            {t("detail.finalDecision")}
          </p>
          <p className="mt-2">
            {t(`decisions.${refundCase.decision!.decisionType}`)}
            {refundCase.decision!.decisionType !== "REJECT" ? (
              <>
                {" "}
                —{" "}
                {formatRefundMoney(
                  refundCase.decision!.approvedAmount,
                  refundCase.order.currency,
                  locale
                )}
              </>
            ) : null}
          </p>
          {refundCase.decision!.reason ? (
            <p className="mt-2 whitespace-pre-wrap text-neutral-700">
              {refundCase.decision!.reason}
            </p>
          ) : null}
          {refundCase.finalDecisionAt ? (
            <p className="mt-2 text-xs text-neutral-500">
              {t("detail.recorded", {
                date: formatRefundDate(refundCase.finalDecisionAt, locale),
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      <DisputeChatPanel
        refundCaseId={refundCase.id}
        locale={locale}
        onCaseUpdated={() => void loadCase({ silent: true })}
      />
    </div>
  );
}
