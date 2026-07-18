"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import type { SellerType } from "@/domain/vendor/vendor-types";
import type { VendorStatus } from "@/domain/vendor/vendor-status";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { isMembershipBillingSuspension } from "@/lib/membership/subscription-policy";
import { toast } from "@/lib/utils/toast";

type VendorDetail = {
  id: string;
  status: VendorStatus;
  onboardingStep: string;
  storeName: string | null;
  storeSlug: string | null;
  sellerType: SellerType;
  businessType: string | null;
  industryType: string | null;
  logoUrl: string | null;
  description: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  sellerTypeAudit: {
    updatedAt: string;
    updatedBy: string | null;
  } | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    status: string;
  };
  kycDocuments: Array<{
    id: string;
    documentType: string;
    documentUrl: string;
    selfieWithIdUrl: string | null;
    reviewStatus: string;
    rejectionReason: string | null;
  }>;
  address: {
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
    proofOfAddressUrl: string | null;
  } | null;
  payoutMethod: {
    method: string;
    accountName: string | null;
    accountNumberOrIban: string | null;
    bankName: string | null;
    stripeEmail: string | null;
  } | null;
  outstandingFees: {
    currency: string;
    pendingMembershipAmount: number;
    pendingMembershipCount: number;
    totalPlatformCommissionCollected: number;
  };
  subscription: {
    status: "TRIAL" | "ACTIVE" | "FAILED" | "SUSPENDED";
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    gracePeriodEndsAt: string | null;
    failedPaymentCount: number;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripeDefaultPaymentMethodId: string | null;
    lastPaymentAt: string | null;
    nextBillingAt: string | null;
  };
  products: Array<{
    id: string;
    name: string;
    slug: string;
    priceAmount: number;
    currency: string;
    stockQty: number;
    approvalStatus: string;
    isActive: boolean;
    categoryName: string;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    status: string;
    orderNumber: string;
    paymentStatus: string;
    grandTotalAmount: number;
    currency: string;
    itemCount: number;
    createdAt: string;
  }>;
  subscriptionHistory: Array<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    stripeInvoiceId: string | null;
    stripePaymentId: string | null;
    failureCode: string | null;
    failureReason: string | null;
    periodStart: string;
    periodEnd: string;
    dueAt: string;
    paidAt: string | null;
    waivedReason: string | null;
  }>;
};

type PendingAction =
  | {
      type: "approve" | "reject" | "suspend" | "reactivate";
    }
  | null;

const statusBadgeClass: Record<VendorStatus, string> = {
  ONBOARDING: "bg-sky-50 text-sky-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  SUSPENDED: "bg-neutral-200 text-neutral-700",
};

const sellerTypeClass: Record<SellerType, string> = {
  PLATFORM: "bg-blue-50 text-blue-700",
  THIRD_PARTY: "bg-neutral-100 text-neutral-700",
};

const VENDOR_DETAIL_POLL_MS = 15_000;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="mt-0.5 wrap-break-word text-sm text-neutral-800">{children}</dd>
    </div>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export default function AdminVendorDetailPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params?.id;
  const t = useTranslations("AdminPages.vendors");
  const td = useTranslations("AdminPages.vendors.detail");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [markingInvoiceId, setMarkingInvoiceId] = useState<string | null>(null);
  const [waivingInvoiceId, setWaivingInvoiceId] = useState<string | null>(null);

  const productsPagination = useClientPagination(vendor?.products ?? [], {
    initialPageSize: 10,
    resetKey: vendor?.id,
  });
  const ordersPagination = useClientPagination(vendor?.orders ?? [], {
    initialPageSize: 10,
    resetKey: vendor?.id,
  });
  const subscriptionPagination = useClientPagination(vendor?.subscriptionHistory ?? [], {
    initialPageSize: 10,
    resetKey: vendor?.id,
  });

  const toErrorMessage = useCallback(
    (error: unknown) =>
      error instanceof Error && error.message ? error.message : t("toasts.genericError"),
    [t]
  );

  const displayDate = useCallback(
    (iso: string | null) => {
      if (!iso) return "—";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [locale]
  );

  const displayDay = useCallback(
    (iso: string | null) => {
      if (!iso) return "—";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },
    [locale]
  );

  const formatMoney = useCallback(
    (amount: number, currency: string) => {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currency || "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount / 100);
      } catch {
        return `${currency} ${(amount / 100).toFixed(2)}`;
      }
    },
    [locale]
  );

  const loadVendor = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!vendorId) return;
      if (!opts?.silent) setLoading(true);
      try {
        const response = await fetchWithAuth(`/api/admin/vendors/${vendorId}`, {
          cache: "no-store",
        });
        const data = await parseApiResponse<VendorDetail>(response);
        setVendor(data);
      } catch (error) {
        if (!opts?.silent) {
          toast.error(td("loadError"), toErrorMessage(error));
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [td, toErrorMessage, vendorId]
  );

  useEffect(() => {
    if (!authLoading && user && vendorId) {
      void loadVendor();
    }
  }, [authLoading, user, vendorId, loadVendor]);

  useEffect(() => {
    if (authLoading || !user || !vendorId || !vendor) return;

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadVendor({ silent: true });
      }
    }, VENDOR_DETAIL_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadVendor({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authLoading, user, vendorId, vendor, loadVendor]);

  const submitAction = async () => {
    if (!vendor || !pendingAction) return;
    if (pendingAction.type === "reject" && rejectReason.trim().length < 3) {
      toast.error(t("toasts.reasonRequired"), t("toasts.reasonMin"));
      return;
    }
    if (pendingAction.type === "suspend" && actionReason.trim().length < 3) {
      toast.error(t("toasts.reasonRequired"), t("toasts.reasonMin"));
      return;
    }

    setSubmitting(true);
    try {
      let response: Response;

      if (pendingAction.type === "approve") {
        response = await fetchWithAuth(`/api/admin/vendors/${vendor.id}/approve`, {
          method: "POST",
        });
      } else if (pendingAction.type === "reject") {
        response = await fetchWithAuth(`/api/admin/vendors/${vendor.id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        });
      } else if (pendingAction.type === "suspend") {
        response = await fetchWithAuth(`/api/admin/vendors/${vendor.id}/suspend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: actionReason.trim() }),
        });
      } else {
        response = await fetchWithAuth(`/api/admin/vendors/${vendor.id}/reactivate`, {
          method: "POST",
        });
      }

      await parseApiResponse(response);
      toast.success(
        pendingAction.type === "approve"
          ? t("toasts.approved")
          : pendingAction.type === "reject"
            ? t("toasts.rejected")
            : pendingAction.type === "suspend"
              ? t("toasts.suspended")
              : t("toasts.reactivated")
      );
      setPendingAction(null);
      setRejectReason("");
      setActionReason("");
      await loadVendor();
    } catch (error) {
      toast.error(
        pendingAction.type === "approve"
          ? t("toasts.approveFailed")
          : pendingAction.type === "reject"
            ? t("toasts.rejectFailed")
            : pendingAction.type === "suspend"
              ? t("toasts.suspendFailed")
              : t("toasts.reactivateFailed"),
        toErrorMessage(error)
      );
    } finally {
      setSubmitting(false);
    }
  };

  const markInvoicePaid = async (invoiceId: string) => {
    setMarkingInvoiceId(invoiceId);
    try {
      const response = await fetchWithAuth(
        `/api/admin/membership/invoices/${invoiceId}/mark-paid`,
        { method: "POST" }
      );
      await parseApiResponse(response);
      toast.success(td("toasts.markedPaid"));
      await loadVendor({ silent: true });
    } catch (error) {
      toast.error(td("toasts.markPaidFailed"), toErrorMessage(error));
    } finally {
      setMarkingInvoiceId(null);
    }
  };

  const waiveInvoice = async (invoiceId: string) => {
    const reason = window.prompt(td("fields.waivePrompt"), td("fields.waiveDefault"));
    if (reason == null) return;

    setWaivingInvoiceId(invoiceId);
    try {
      const response = await fetchWithAuth(
        `/api/admin/membership/invoices/${invoiceId}/waive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );
      await parseApiResponse(response);
      toast.success(td("toasts.waived"));
      await loadVendor({ silent: true });
    } catch (error) {
      toast.error(td("toasts.waiveFailed"), toErrorMessage(error));
    } finally {
      setWaivingInvoiceId(null);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-500">{t("loading")}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-4 pb-8">
        <Link
          href="/admin/vendors"
          className="text-sm font-semibold text-[#0F3460] hover:underline"
        >
          {td("back")}
        </Link>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          {td("notFound")}
        </div>
      </div>
    );
  }

  const storeName = vendor.storeName ?? t("untitledStore");
  const billingSuspended = isMembershipBillingSuspension(vendor.suspensionReason);
  const hasBankDetails = Boolean(
    vendor.payoutMethod?.accountName ||
      vendor.payoutMethod?.accountNumberOrIban ||
      vendor.payoutMethod?.bankName
  );

  const productStatusLabel = (status: string) => {
    if (
      status === "DRAFT" ||
      status === "PENDING_APPROVAL" ||
      status === "APPROVED" ||
      status === "REJECTED" ||
      status === "ARCHIVED"
    ) {
      return td(`productStatuses.${status}`);
    }
    return status.replaceAll("_", " ");
  };

  const productStatusClass = (status: string) => {
    if (status === "APPROVED") return "bg-emerald-50 text-emerald-700";
    if (status === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700";
    if (status === "REJECTED") return "bg-rose-50 text-rose-700";
    if (status === "ARCHIVED") return "bg-neutral-100 text-neutral-600";
    return "bg-sky-50 text-sky-700";
  };

  const invoiceStatusLabel = (status: string) => {
    if (
      status === "PENDING" ||
      status === "PAID" ||
      status === "WAIVED" ||
      status === "FAILED"
    ) {
      return td(`invoiceStatuses.${status}`);
    }
    return status;
  };

  const invoiceStatusClass = (status: string) => {
    if (status === "PAID") return "bg-emerald-50 text-emerald-700";
    if (status === "PENDING") return "bg-amber-50 text-amber-700";
    if (status === "WAIVED") return "bg-sky-50 text-sky-700";
    return "bg-neutral-100 text-neutral-600";
  };

  const membershipClass =
    vendor.sellerType === "PLATFORM"
      ? "bg-neutral-100 text-neutral-600"
      : vendor.subscription.status === "ACTIVE"
        ? "bg-emerald-50 text-emerald-700"
        : vendor.subscription.status === "TRIAL"
          ? "bg-sky-50 text-sky-700"
          : vendor.subscription.status === "FAILED"
            ? "bg-amber-50 text-amber-800"
            : "bg-rose-50 text-rose-700";

  return (
    <div className="w-full min-w-0 space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/vendors"
            className="text-sm font-semibold text-[#0F3460] hover:underline"
          >
            {td("back")}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              {storeName}
            </h1>
            <Badge className={statusBadgeClass[vendor.status]}>
              {t(`statuses.${vendor.status}`)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500">{vendor.user.fullName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {vendor.status === "PENDING_APPROVAL" ? (
            <>
              <button
                type="button"
                onClick={() => setPendingAction({ type: "approve" })}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {t("actions.approve")}
              </button>
              <button
                type="button"
                onClick={() => setPendingAction({ type: "reject" })}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {t("actions.reject")}
              </button>
            </>
          ) : null}
          {vendor.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => setPendingAction({ type: "suspend" })}
              className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white"
            >
              {t("actions.suspend")}
            </button>
          ) : null}
          {vendor.status === "SUSPENDED" ? (
            <button
              type="button"
              onClick={() => setPendingAction({ type: "reactivate" })}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {t("actions.reactivate")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={td("sections.overview")}>
          <div className="flex gap-4">
            {vendor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vendor.logoUrl}
                alt={storeName}
                className="h-20 w-20 shrink-0 rounded-xl border border-neutral-200 object-cover"
              />
            ) : null}
            <dl className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={td("fields.email")}>{vendor.user.email}</Field>
              <Field label={td("fields.phone")}>{vendor.user.phone}</Field>
              <Field label={td("fields.storeSlug")}>{vendor.storeSlug ?? "—"}</Field>
              <Field label={td("fields.shopType")}>
                <Badge className={sellerTypeClass[vendor.sellerType]}>
                  {t(`sellerTypes.${vendor.sellerType}`)}
                </Badge>
              </Field>
              <Field label={td("fields.businessType")}>
                {vendor.businessType === "INDIVIDUAL" ||
                vendor.businessType === "REGISTERED_BUSINESS"
                  ? t(`businessTypes.${vendor.businessType}`)
                  : (vendor.businessType ?? "—")}
              </Field>
              <Field label={td("fields.industry")}>
                {vendor.industryType
                  ? vendor.industryType.replaceAll("_", " ")
                  : "—"}
              </Field>
              <Field label={td("fields.onboardingStep")}>
                {vendor.onboardingStep.replaceAll("_", " ")}
              </Field>
              <Field label={td("fields.submittedAt")}>
                {displayDate(vendor.submittedAt)}
              </Field>
              <Field label={td("fields.approvedAt")}>
                {displayDate(vendor.approvedAt)}
              </Field>
              <Field label={td("fields.rejectedAt")}>
                {displayDate(vendor.rejectedAt)}
              </Field>
              {vendor.rejectionReason ? (
                <Field label={td("fields.rejectionReason")}>
                  {vendor.rejectionReason}
                </Field>
              ) : null}
              <Field label={td("fields.suspendedAt")}>
                {displayDate(vendor.suspendedAt)}
              </Field>
              {vendor.suspensionReason ? (
                <Field label={td("fields.suspensionReason")}>
                  {vendor.suspensionReason}
                </Field>
              ) : null}
              <Field label={td("fields.shopTypeUpdated")}>
                {displayDate(vendor.sellerTypeAudit?.updatedAt ?? null)}
              </Field>
              <Field label={td("fields.shopTypeUpdatedBy")}>
                {vendor.sellerTypeAudit?.updatedBy ?? "—"}
              </Field>
              {vendor.description ? (
                <div className="sm:col-span-2">
                  <Field label={td("fields.description")}>{vendor.description}</Field>
                </div>
              ) : null}
            </dl>
          </div>
        </Section>

        <Section title={td("sections.address")}>
          {vendor.address ? (
            <div className="space-y-2 text-sm text-neutral-700">
              <p>{vendor.address.addressLine1}</p>
              <p>
                {vendor.address.city}, {vendor.address.country}{" "}
                {vendor.address.postalCode}
              </p>
              {vendor.address.proofOfAddressUrl ? (
                <a
                  href={vendor.address.proofOfAddressUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#0F3460] hover:underline"
                >
                  {td("fields.proofOfAddress")} ↗
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">{td("fields.noAddress")}</p>
          )}
        </Section>
      </div>

      <Section title={td("sections.payout")}>
        {!vendor.payoutMethod ? (
          <p className="text-sm text-neutral-500">{td("fields.noPayout")}</p>
        ) : hasBankDetails ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            <Field label={td("fields.accountHolder")}>
              {vendor.payoutMethod.accountName ?? "—"}
            </Field>
            <Field label={td("fields.accountIban")}>
              {vendor.payoutMethod.accountNumberOrIban ?? "—"}
            </Field>
            <Field label={td("fields.bank")}>
              {vendor.payoutMethod.bankName ?? "—"}
            </Field>
          </dl>
        ) : (
          <p className="text-sm text-neutral-500">{td("fields.noBankDetails")}</p>
        )}
      </Section>

      <Section title={td("sections.kyc")}>
        {vendor.kycDocuments.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {vendor.kycDocuments.map((doc) => (
              <article
                key={doc.id}
                className="rounded-xl border border-neutral-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-800">
                    {doc.documentType === "PASSPORT" ||
                    doc.documentType === "DRIVERS_LICENSE" ||
                    doc.documentType === "NATIONAL_ID"
                      ? td(`kycTypes.${doc.documentType}`)
                      : doc.documentType.replaceAll("_", " ")}
                  </p>
                  <Badge className="bg-neutral-100 text-neutral-700">
                    {doc.reviewStatus === "PENDING" ||
                    doc.reviewStatus === "APPROVED" ||
                    doc.reviewStatus === "REJECTED"
                      ? td(`kycStatuses.${doc.reviewStatus}`)
                      : doc.reviewStatus.replaceAll("_", " ")}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-neutral-500">
                      {td("fields.document")}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.documentUrl}
                      alt={doc.documentType}
                      className="h-40 w-full rounded-lg border border-neutral-200 object-cover"
                    />
                  </div>
                  {doc.selfieWithIdUrl ? (
                    <div>
                      <p className="mb-1 text-xs font-medium text-neutral-500">
                        {td("fields.selfie")}
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.selfieWithIdUrl}
                        alt="selfie"
                        className="h-40 w-full rounded-lg border border-neutral-200 object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">{td("fields.noKyc")}</p>
        )}
      </Section>

      <Section title={td("sections.fees")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-xs font-medium text-amber-800">
              {td("fields.pendingMembership")}
            </p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {formatMoney(
                vendor.outstandingFees.pendingMembershipAmount,
                vendor.outstandingFees.currency
              )}
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              {td("fields.pendingInvoices", {
                count: vendor.outstandingFees.pendingMembershipCount,
              })}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-medium text-neutral-500">
              {td("fields.feesCollected")}
            </p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {formatMoney(
                vendor.outstandingFees.totalPlatformCommissionCollected,
                vendor.outstandingFees.currency
              )}
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              {td("fields.feesCollectedSub")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 p-4">
            <p className="text-xs font-medium text-neutral-500">
              {td("fields.membershipStatus")}
            </p>
            <div className="mt-2">
              <Badge className={membershipClass}>
                {vendor.sellerType === "PLATFORM"
                  ? t("membership.exempt")
                  : t(`membership.${vendor.subscription.status}`)}
              </Badge>
            </div>
            {vendor.sellerType !== "PLATFORM" ? (
              <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label={td("fields.trialEnds")}>
                  {displayDate(vendor.subscription.trialEndsAt)}
                </Field>
                <Field label={td("fields.nextBilling")}>
                  {displayDate(vendor.subscription.nextBillingAt)}
                </Field>
                <Field label={td("fields.lastPayment")}>
                  {displayDate(vendor.subscription.lastPaymentAt)}
                </Field>
                <Field label={td("fields.graceEnds")}>
                  {displayDate(vendor.subscription.gracePeriodEndsAt)}
                </Field>
                <Field label={td("fields.periodStart")}>
                  {displayDate(vendor.subscription.currentPeriodStart)}
                </Field>
                <Field label={td("fields.periodEnd")}>
                  {displayDate(vendor.subscription.currentPeriodEnd)}
                </Field>
                <Field label={td("fields.failedCount")}>
                  {vendor.subscription.failedPaymentCount}
                </Field>
              </dl>
            ) : null}
          </div>
          <details className="rounded-xl border border-neutral-200 p-4">
            <summary className="cursor-pointer text-sm font-medium text-neutral-700">
              {td("fields.stripeIds")}
            </summary>
            <dl className="mt-3 space-y-2 text-xs text-neutral-700">
              <Field label={td("fields.customerId")}>
                <span className="font-mono">
                  {vendor.subscription.stripeCustomerId ?? "—"}
                </span>
              </Field>
              <Field label={td("fields.subscriptionId")}>
                <span className="font-mono">
                  {vendor.subscription.stripeSubscriptionId ?? "—"}
                </span>
              </Field>
              <Field label={td("fields.paymentMethodId")}>
                <span className="font-mono">
                  {vendor.subscription.stripeDefaultPaymentMethodId ?? "—"}
                </span>
              </Field>
            </dl>
          </details>
        </div>
      </Section>

      <Section title={`${td("sections.products")} (${vendor.products.length})`}>
        {vendor.products.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-start text-xs font-semibold text-neutral-500">
                    <th className="px-3 py-2">{td("fields.product")}</th>
                    <th className="px-3 py-2">{td("fields.category")}</th>
                    <th className="px-3 py-2">{td("fields.price")}</th>
                    <th className="px-3 py-2">{td("fields.stock")}</th>
                    <th className="px-3 py-2">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {productsPagination.paginatedItems.map((product) => (
                    <tr key={product.id}>
                      <td className="px-3 py-3">
                        <p className="font-medium text-neutral-900">{product.name}</p>
                        <p className="text-xs text-neutral-500">{product.slug}</p>
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {product.categoryName}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {formatMoney(product.priceAmount, product.currency)}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">{product.stockQty}</td>
                      <td className="px-3 py-3">
                        <Badge className={productStatusClass(product.approvalStatus)}>
                          {productStatusLabel(product.approvalStatus)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              pageIndex={productsPagination.pageIndex}
              pageCount={productsPagination.pageCount}
              pageSize={productsPagination.pageSize}
              pageSizeOptions={productsPagination.pageSizeOptions}
              onPageIndexChange={productsPagination.setPageIndex}
              onPageSizeChange={productsPagination.setPageSize}
            />
          </>
        ) : (
          <p className="text-sm text-neutral-500">{td("fields.noProducts")}</p>
        )}
      </Section>

      <Section title={`${td("sections.orders")} (${vendor.orders.length})`}>
        {vendor.orders.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-start text-xs font-semibold text-neutral-500">
                    <th className="px-3 py-2">{td("fields.order")}</th>
                    <th className="px-3 py-2">{td("fields.date")}</th>
                    <th className="px-3 py-2">{td("fields.items")}</th>
                    <th className="px-3 py-2">{td("fields.total")}</th>
                    <th className="px-3 py-2">{t("columns.status")}</th>
                    <th className="px-3 py-2">{td("fields.payment")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {ordersPagination.paginatedItems.map((order) => (
                    <tr key={order.id}>
                      <td className="px-3 py-3 font-medium text-neutral-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {displayDate(order.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">{order.itemCount}</td>
                      <td className="px-3 py-3 text-neutral-700">
                        {formatMoney(order.grandTotalAmount, order.currency)}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {order.status.replaceAll("_", " ")}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {order.paymentStatus.replaceAll("_", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              pageIndex={ordersPagination.pageIndex}
              pageCount={ordersPagination.pageCount}
              pageSize={ordersPagination.pageSize}
              pageSizeOptions={ordersPagination.pageSizeOptions}
              onPageIndexChange={ordersPagination.setPageIndex}
              onPageSizeChange={ordersPagination.setPageSize}
            />
          </>
        ) : (
          <p className="text-sm text-neutral-500">{td("fields.noOrders")}</p>
        )}
      </Section>

      <Section title={td("sections.invoices")}>
        {vendor.subscriptionHistory.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-start text-xs font-semibold text-neutral-500">
                    <th className="px-3 py-2">{td("fields.period")}</th>
                    <th className="px-3 py-2">{td("fields.amount")}</th>
                    <th className="px-3 py-2">{td("fields.due")}</th>
                    <th className="px-3 py-2">{td("fields.paid")}</th>
                    <th className="px-3 py-2">{t("columns.status")}</th>
                    <th className="px-3 py-2">{td("fields.failure")}</th>
                    <th className="px-3 py-2">{t("columns.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {subscriptionPagination.paginatedItems.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-3 py-3 text-neutral-700">
                        {displayDay(invoice.periodStart)} – {displayDay(invoice.periodEnd)}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {formatMoney(invoice.amount, invoice.currency)}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {displayDate(invoice.dueAt)}
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {displayDate(invoice.paidAt)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge className={invoiceStatusClass(invoice.status)}>
                          {invoiceStatusLabel(invoice.status)}
                        </Badge>
                      </td>
                      <td className="max-w-[180px] px-3 py-3 text-xs text-neutral-600">
                        {invoice.failureReason ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        {invoice.status === "PENDING" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void markInvoicePaid(invoice.id)}
                              disabled={markingInvoiceId === invoice.id}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {markingInvoiceId === invoice.id
                                ? td("fields.saving")
                                : td("fields.markPaid")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void waiveInvoice(invoice.id)}
                              disabled={waivingInvoiceId === invoice.id}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 disabled:opacity-60"
                            >
                              {waivingInvoiceId === invoice.id
                                ? td("fields.waiving")
                                : td("fields.waive")}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              pageIndex={subscriptionPagination.pageIndex}
              pageCount={subscriptionPagination.pageCount}
              pageSize={subscriptionPagination.pageSize}
              pageSizeOptions={subscriptionPagination.pageSizeOptions}
              onPageIndexChange={subscriptionPagination.setPageIndex}
              onPageSizeChange={subscriptionPagination.setPageSize}
            />
          </>
        ) : (
          <p className="text-sm text-neutral-500">{td("fields.noInvoices")}</p>
        )}
      </Section>

      {pendingAction ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-neutral-900">
              {pendingAction.type === "approve"
                ? t("confirm.approveTitle")
                : pendingAction.type === "reject"
                  ? t("confirm.rejectTitle")
                  : pendingAction.type === "suspend"
                    ? t("confirm.suspendTitle")
                    : t("confirm.reactivateTitle")}
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              {pendingAction.type === "approve"
                ? t("confirm.approveBody")
                : pendingAction.type === "reject"
                  ? t("confirm.rejectBody")
                  : pendingAction.type === "suspend"
                    ? t("confirm.suspendBody")
                    : billingSuspended
                      ? t("confirm.reactivateBillingBody")
                      : t("confirm.reactivateBody")}
            </p>
            <p className="mt-2 text-sm font-medium text-neutral-800">{storeName}</p>

            {pendingAction.type === "reject" ? (
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
                placeholder={t("confirm.rejectPlaceholder")}
              />
            ) : null}

            {pendingAction.type === "suspend" ? (
              <textarea
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
                placeholder={t("confirm.suspendPlaceholder")}
              />
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setRejectReason("");
                  setActionReason("");
                }}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {t("confirm.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void submitAction()}
                disabled={submitting}
                className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  pendingAction.type === "approve" || pendingAction.type === "reactivate"
                    ? "bg-emerald-600"
                    : pendingAction.type === "reject"
                      ? "bg-rose-600"
                      : "bg-neutral-700"
                }`}
              >
                {submitting
                  ? t("confirm.submitting")
                  : pendingAction.type === "approve"
                    ? t("actions.approve")
                    : pendingAction.type === "reject"
                      ? t("actions.reject")
                      : pendingAction.type === "suspend"
                        ? t("actions.suspend")
                        : t("actions.reactivate")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
