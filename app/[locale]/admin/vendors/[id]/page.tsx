"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import type { VendorStatus } from "@/domain/vendor/vendor-status";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
import { Link } from "@/i18n/navigation";

type VendorDetail = {
  id: string;
  status: VendorStatus;
  onboardingStep: string;
  storeName: string | null;
  storeSlug: string | null;
  businessType: string | null;
  logoUrl: string | null;
  description: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
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
  agreementAcceptance: {
    agreedToVendorTerms: boolean;
    agreedToMembershipPolicy: boolean;
    agreedToCommissionPolicy: boolean;
    agreedToDisputePolicy: boolean;
    agreedToDeliveryRules: boolean;
    acceptedAt: string;
  } | null;
};

type PendingAction =
  | {
      type: "approve" | "reject";
    }
  | null;

const statusBadgeClass: Record<VendorStatus, string> = {
  ONBOARDING: "bg-sky-50 text-sky-700",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  SUSPENDED: "bg-neutral-200 text-neutral-700",
};

const displayDate = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Something went wrong";

export default function AdminVendorDetailPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params?.id;
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadVendor = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/admin/vendors/${vendorId}`);
      const data = await parseApiResponse<VendorDetail>(response);
      setVendor(data);
    } catch (error) {
      toast.error("Failed to load vendor", toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (!authLoading && user && vendorId) {
      void loadVendor();
    }
  }, [authLoading, user, vendorId, loadVendor]);

  const submitAction = async () => {
    if (!vendor || !pendingAction) return;
    if (pendingAction.type === "reject" && rejectReason.trim().length < 3) {
      toast.error("Reason is required", "Please provide at least 3 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response =
        pendingAction.type === "approve"
          ? await fetchWithAuth(`/api/admin/vendors/${vendor.id}/approve`, {
              method: "POST",
            })
          : await fetchWithAuth(`/api/admin/vendors/${vendor.id}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: rejectReason.trim() }),
            });
      await parseApiResponse(response);
      toast.success(
        pendingAction.type === "approve" ? "Vendor approved" : "Vendor disapproved"
      );
      setPendingAction(null);
      setRejectReason("");
      await loadVendor();
    } catch (error) {
      toast.error(
        pendingAction.type === "approve" ? "Approval failed" : "Disapproval failed",
        toErrorMessage(error)
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-neutral-600">Loading...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-4">
        <Link href="/admin/vendors" className="text-sm font-semibold text-[#0f3460]">
          Back to Vendors
        </Link>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Vendor not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin/vendors"
              className="text-xs font-semibold uppercase tracking-wider text-[#0f3460] hover:underline"
            >
              Back to Vendors
            </Link>
            <h2 className="mt-2 text-2xl font-semibold text-[#0f3460]">
              {vendor.storeName ?? "Untitled store"}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">{vendor.user.fullName}</p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              statusBadgeClass[vendor.status]
            }`}
          >
            {vendor.status.replaceAll("_", " ")}
          </span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Vendor Information
          </h3>
          <div className="mt-3 space-y-1 text-sm text-neutral-700">
            <p>Email: {vendor.user.email}</p>
            <p>Phone: {vendor.user.phone}</p>
            <p>Store slug: {vendor.storeSlug ?? "—"}</p>
            <p>Business type: {vendor.businessType ?? "—"}</p>
            <p>Onboarding step: {vendor.onboardingStep.replaceAll("_", " ")}</p>
            <p>Submitted at: {displayDate(vendor.submittedAt)}</p>
            <p>Approved at: {displayDate(vendor.approvedAt)}</p>
            <p>Rejected at: {displayDate(vendor.rejectedAt)}</p>
            {vendor.rejectionReason ? <p>Rejection reason: {vendor.rejectionReason}</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Address & Payout
          </h3>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            {vendor.address ? (
              <>
                <p>{vendor.address.addressLine1}</p>
                <p>
                  {vendor.address.city}, {vendor.address.country} {vendor.address.postalCode}
                </p>
                {vendor.address.proofOfAddressUrl ? (
                  <a
                    href={vendor.address.proofOfAddressUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Proof of address
                  </a>
                ) : null}
              </>
            ) : (
              <p>No address submitted.</p>
            )}
            <hr className="my-2 border-neutral-200" />
            {vendor.payoutMethod ? (
              <>
                <p>Method: {vendor.payoutMethod.method}</p>
                <p>Account name: {vendor.payoutMethod.accountName ?? "—"}</p>
                <p>Account/IBAN: {vendor.payoutMethod.accountNumberOrIban ?? "—"}</p>
                <p>Bank: {vendor.payoutMethod.bankName ?? "—"}</p>
                <p>Stripe email: {vendor.payoutMethod.stripeEmail ?? "—"}</p>
              </>
            ) : (
              <p>No payout details submitted.</p>
            )}
          </div>
        </section>
      </div>

      {vendor.logoUrl ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Store Logo
          </h3>
          <img
            src={vendor.logoUrl}
            alt={`${vendor.storeName ?? "Vendor"} logo`}
            className="mt-3 h-36 w-36 rounded-xl border border-neutral-200 object-cover"
          />
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          KYC Documents
        </h3>
        {vendor.kycDocuments.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {vendor.kycDocuments.map((doc) => (
              <article key={doc.id} className="rounded-xl border border-neutral-200 p-4">
                <p className="text-sm font-semibold text-neutral-800">
                  {doc.documentType.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Review status: {doc.reviewStatus.replaceAll("_", " ")}
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Document
                    </p>
                    <img
                      src={doc.documentUrl}
                      alt={`${doc.documentType} document`}
                      className="h-44 w-full rounded-lg border border-neutral-200 object-cover"
                    />
                  </div>
                  {doc.selfieWithIdUrl ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        Selfie with ID
                      </p>
                      <img
                        src={doc.selfieWithIdUrl}
                        alt={`${doc.documentType} selfie`}
                        className="h-44 w-full rounded-lg border border-neutral-200 object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No KYC documents available.</p>
        )}
      </section>

      {vendor.status === "PENDING_APPROVAL" ? (
        <section className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPendingAction({ type: "approve" })}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Approve Vendor
          </button>
          <button
            type="button"
            onClick={() => setPendingAction({ type: "reject" })}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Disapprove Vendor
          </button>
        </section>
      ) : null}

      {pendingAction ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-neutral-900">
              {pendingAction.type === "approve"
                ? "Approve vendor?"
                : "Disapprove vendor?"}
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              {pendingAction.type === "approve"
                ? "This will activate the vendor account."
                : "This will reject the vendor request."}
            </p>

            {pendingAction.type === "reject" ? (
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Reason for disapproval"
              />
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setRejectReason("");
                }}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitAction()}
                disabled={submitting}
                className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  pendingAction.type === "approve" ? "bg-emerald-600" : "bg-rose-600"
                }`}
              >
                {submitting
                  ? "Submitting..."
                  : pendingAction.type === "approve"
                    ? "Approve"
                    : "Disapprove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
