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
  industryType: string | null;
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
  outstandingFees: {
    currency: string;
    pendingMembershipAmount: number;
    pendingMembershipCount: number;
    totalPlatformCommissionCollected: number;
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

const displayDate = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
};

const productStatusClass = (status: string) => {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700";
  if (status === "REJECTED") return "bg-rose-50 text-rose-700";
  if (status === "ARCHIVED") return "bg-neutral-100 text-neutral-600";
  return "bg-sky-50 text-sky-700";
};

const invoiceStatusClass = (status: string) => {
  if (status === "PAID") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "WAIVED") return "bg-sky-50 text-sky-700";
  return "bg-neutral-100 text-neutral-600";
};

const orderStatusClass = (status: string) => {
  if (status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (status === "SHIPPED") return "bg-cyan-50 text-cyan-700";
  if (status === "PREPARING") return "bg-yellow-50 text-yellow-700";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-blue-700";
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Something went wrong";

/** How often to pull fresh vendor data while this page is open (vendor payout edits, etc.). */
const VENDOR_DETAIL_POLL_MS = 15_000;

export default function AdminVendorDetailPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params?.id;
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadVendor = useCallback(async (opts?: { silent?: boolean }) => {
    if (!vendorId) return;
    if (!opts?.silent) {
      setLoading(true);
    }
    try {
      const response = await fetchWithAuth(`/api/admin/vendors/${vendorId}`, {
        cache: "no-store",
      });
      const data = await parseApiResponse<VendorDetail>(response);
      setVendor(data);
    } catch (error) {
      if (!opts?.silent) {
        toast.error("Failed to load vendor", toErrorMessage(error));
      }
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, [vendorId]);

  useEffect(() => {
    if (!authLoading && user && vendorId) {
      void loadVendor();
    }
  }, [authLoading, user, vendorId, loadVendor]);

  /** Keep payout / profile in sync when vendors edit Settings on another session or tab. */
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
      toast.error("Reason is required", "Please provide at least 3 characters.");
      return;
    }
    if (pendingAction.type === "suspend" && actionReason.trim().length < 3) {
      toast.error("Reason is required", "Please provide at least 3 characters.");
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
          ? "Vendor approved"
          : pendingAction.type === "reject"
            ? "Vendor disapproved"
            : pendingAction.type === "suspend"
              ? "Vendor suspended"
              : "Vendor reactivated"
      );
      setPendingAction(null);
      setRejectReason("");
      setActionReason("");
      await loadVendor();
    } catch (error) {
      toast.error(
        pendingAction.type === "approve"
          ? "Approval failed"
          : pendingAction.type === "reject"
            ? "Disapproval failed"
            : pendingAction.type === "suspend"
              ? "Suspension failed"
              : "Reactivation failed",
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
          <div className="flex flex-col items-end gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                statusBadgeClass[vendor.status]
              }`}
            >
              {vendor.status.replaceAll("_", " ")}
            </span>
            {vendor.status === "PENDING_APPROVAL" ? (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: "approve" })}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: "reject" })}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Disapprove
                </button>
              </div>
            ) : null}
            {vendor.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => setPendingAction({ type: "suspend" })}
                className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white"
              >
                Suspend Vendor
              </button>
            ) : null}
            {vendor.status === "SUSPENDED" ? (
              <button
                type="button"
                onClick={() => setPendingAction({ type: "reactivate" })}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Reactivate Vendor
              </button>
            ) : null}
          </div>
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
            <p>Industry type: {vendor.industryType ? vendor.industryType.replaceAll("_", " ") : "—"}</p>
            <p>Onboarding step: {vendor.onboardingStep.replaceAll("_", " ")}</p>
            <p>Submitted at: {displayDate(vendor.submittedAt)}</p>
            <p>Approved at: {displayDate(vendor.approvedAt)}</p>
            <p>Rejected at: {displayDate(vendor.rejectedAt)}</p>
            {vendor.rejectionReason ? <p>Rejection reason: {vendor.rejectionReason}</p> : null}
            <p>Suspended at: {displayDate(vendor.suspendedAt)}</p>
            {vendor.suspensionReason ? <p>Suspension reason: {vendor.suspensionReason}</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Address
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
                    Proof of address ↗
                  </a>
                ) : null}
              </>
            ) : (
              <p className="text-neutral-400">No address submitted.</p>
            )}
          </div>
        </section>

        {/* Payout details — show each method section independently */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Payout Details
            {vendor.payoutMethod && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                Preferred: {vendor.payoutMethod.method === "BANK" ? "Bank account" : "PayPal / Stripe"}
              </span>
            )}
          </h3>

          {!vendor.payoutMethod ? (
            <p className="mt-3 text-sm text-neutral-400">No payout details submitted.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {/* Bank account */}
              {(vendor.payoutMethod.accountName ||
                vendor.payoutMethod.accountNumberOrIban ||
                vendor.payoutMethod.bankName) ? (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Foreign Bank Account
                  </p>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-neutral-500 shrink-0">Account holder:</dt>
                      <dd className="text-neutral-800">{vendor.payoutMethod.accountName ?? "—"}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-neutral-500 shrink-0">Account / IBAN:</dt>
                      <dd className="break-all text-neutral-800">
                        {vendor.payoutMethod.accountNumberOrIban ?? "—"}
                      </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-neutral-500 shrink-0">Bank:</dt>
                      <dd className="text-neutral-800">{vendor.payoutMethod.bankName ?? "—"}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              {/* Digital wallet */}
              {vendor.payoutMethod.stripeEmail ? (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    PayPal / Stripe
                  </p>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-medium text-neutral-500 shrink-0">Email:</dt>
                      <dd className="break-all text-neutral-800">{vendor.payoutMethod.stripeEmail}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              {/* Fallback if method exists but no fields filled */}
              {!vendor.payoutMethod.accountName &&
               !vendor.payoutMethod.accountNumberOrIban &&
               !vendor.payoutMethod.bankName &&
               !vendor.payoutMethod.stripeEmail && (
                <p className="text-sm text-neutral-400">Payout record exists but no details filled in.</p>
              )}
            </div>
          )}
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

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Outstanding Fees
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Pending subscription fees
            </p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {formatMoney(
                vendor.outstandingFees.pendingMembershipAmount,
                vendor.outstandingFees.currency
              )}
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              {vendor.outstandingFees.pendingMembershipCount} unpaid invoice
              {vendor.outstandingFees.pendingMembershipCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Platform commission collected
            </p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">
              {formatMoney(
                vendor.outstandingFees.totalPlatformCommissionCollected,
                vendor.outstandingFees.currency
              )}
            </p>
            <p className="mt-1 text-sm text-neutral-600">Total $3.99 fees from orders</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Products ({vendor.products.length})
        </h3>
        {vendor.products.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendor.products.map((product) => (
                  <tr key={product.id} className="border-b border-neutral-100">
                    <td className="px-3 py-3">
                      <p className="font-medium text-neutral-900">{product.name}</p>
                      <p className="text-xs text-neutral-500">{product.slug}</p>
                    </td>
                    <td className="px-3 py-3 text-neutral-700">{product.categoryName}</td>
                    <td className="px-3 py-3 text-neutral-700">
                      {formatMoney(product.priceAmount, product.currency)}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">{product.stockQty}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${productStatusClass(product.approvalStatus)}`}
                      >
                        {product.approvalStatus.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">No products yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Orders ({vendor.orders.length})
        </h3>
        {vendor.orders.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Payment</th>
                </tr>
              </thead>
              <tbody>
                {vendor.orders.map((order) => (
                  <tr key={order.id} className="border-b border-neutral-100">
                    <td className="px-3 py-3 font-medium text-neutral-900">{order.orderNumber}</td>
                    <td className="px-3 py-3 text-neutral-700">{displayDate(order.createdAt)}</td>
                    <td className="px-3 py-3 text-neutral-700">{order.itemCount}</td>
                    <td className="px-3 py-3 text-neutral-700">
                      {formatMoney(order.grandTotalAmount, order.currency)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusClass(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {order.paymentStatus.replaceAll("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">No orders yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Subscription Payment History
        </h3>
        {vendor.subscriptionHistory.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendor.subscriptionHistory.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-neutral-100">
                    <td className="px-3 py-3 text-neutral-700">
                      {new Date(invoice.periodStart).toLocaleDateString()} –{" "}
                      {new Date(invoice.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">
                      {formatMoney(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-3 py-3 text-neutral-700">{displayDate(invoice.dueAt)}</td>
                    <td className="px-3 py-3 text-neutral-700">{displayDate(invoice.paidAt)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${invoiceStatusClass(invoice.status)}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">No subscription invoices yet.</p>
        )}
      </section>

      {pendingAction ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-neutral-900">
              {pendingAction.type === "approve"
                ? "Approve vendor?"
                : pendingAction.type === "reject"
                  ? "Disapprove vendor?"
                  : pendingAction.type === "suspend"
                    ? "Suspend vendor?"
                    : "Reactivate vendor?"}
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              {pendingAction.type === "approve"
                ? "This will activate the vendor account."
                : pendingAction.type === "reject"
                  ? "This will reject the vendor request."
                  : pendingAction.type === "suspend"
                    ? "This will hide their store from customers and block vendor login."
                    : "This will restore vendor access and show their store again."}
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

            {pendingAction.type === "suspend" ? (
              <textarea
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                rows={4}
                className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Reason for suspension"
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
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
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
                  ? "Submitting..."
                  : pendingAction.type === "approve"
                    ? "Approve"
                    : pendingAction.type === "reject"
                      ? "Disapprove"
                      : pendingAction.type === "suspend"
                        ? "Suspend"
                        : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
