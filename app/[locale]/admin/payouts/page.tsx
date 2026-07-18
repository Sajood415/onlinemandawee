"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type AdminPayoutItem = {
  id: string;
  status: "ON_HOLD" | "READY" | "SENT" | "FAILED";
  amount: number;
  currency: string;
  holdUntil: string;
  holdLabel: string | null;
  releasedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  eligibleForRelease: boolean;
  vendor: {
    id: string;
    storeName: string | null;
    storeSlug: string | null;
    label: string;
  };
  order: {
    orderVendorId: string;
    orderId: string | null;
    orderNumber: string;
  };
};

type AdminPayoutDetail = AdminPayoutItem & {
  sendMethod: "BANK";
  lineItems: Array<{
    productName: string;
    productSku: string | null;
    variantName: string | null;
    quantity: number;
    unitPriceAmount: number;
    lineTotalAmount: number;
    currency: string;
  }>;
  vendorOrder: {
    status: string;
    deliveryMethod: string | null;
    deliveredAt: string | null;
    subtotalAmount: number;
    deliveryAmount: number;
    discountAmount: number;
    grandTotalAmount: number;
    currency: string;
  };
  commission: {
    rateBps: number;
    baseAmount: number;
    commissionAmount: number;
    currency: string;
  } | null;
  bankDetails: {
    method: string;
    accountName: string | null;
    accountNumberOrIban: string | null;
    bankName: string | null;
    stripeEmail: string | null;
  } | null;
};

type AdminPayoutQueuesResponse = {
  now: string;
  hold: AdminPayoutItem[];
  ready: AdminPayoutItem[];
  released: AdminPayoutItem[];
};

function formatMoney(amount: number, currency: string) {
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
}

function formatHoldUntil(payout: Pick<AdminPayoutItem, "holdUntil" | "holdLabel">) {
  return payout.holdLabel ?? formatDate(payout.holdUntil);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function payoutStatusClass(status: AdminPayoutItem["status"]) {
  if (status === "SENT") return "bg-emerald-50 text-emerald-700";
  if (status === "READY") return "bg-blue-50 text-blue-700";
  if (status === "ON_HOLD") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function payoutStatusLabel(status: AdminPayoutItem["status"]) {
  if (status === "READY") return "RELEASED";
  return status.replace("_", " ");
}

export default function AdminPayoutsPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");

  const [data, setData] = useState<AdminPayoutQueuesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AdminPayoutDetail | null>(null);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/api/admin/payouts");
      const payload = await parseApiResponse<AdminPayoutQueuesResponse>(response);
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payouts.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      void loadPayouts();
    }
  }, [authLoading, user, loadPayouts]);

  const openDetail = useCallback(async (payoutId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/admin/payouts/${payoutId}`);
      const payload = await parseApiResponse<AdminPayoutDetail>(response);
      setDetail(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payout details.");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetail(null);
  }, []);

  const runAction = useCallback(
    async (payoutId: string, type: "release" | "sent") => {
      if (activeActionId) return;
      setActiveActionId(payoutId);
      setError(null);
      try {
        const endpoint = type === "release" ? "/api/admin/payouts/release" : "/api/admin/payouts/sent";
        const body =
          type === "release"
            ? { payoutId }
            : { payoutId, sentVia: "BANK" as const };
        const res = await fetchWithAuth(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await parseApiResponse(res);
        await loadPayouts();
        if (detailOpen && detail?.id === payoutId) {
          await openDetail(payoutId);
        }
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Payout action failed.");
      } finally {
        setActiveActionId(null);
      }
    },
    [activeActionId, detail?.id, detailOpen, loadPayouts, openDetail]
  );

  const queueCounts = useMemo(() => {
    if (!data) return { hold: 0, ready: 0, released: 0 };
    return {
      hold: data.hold.length,
      ready: data.ready.length,
      released: data.released.length,
    };
  }, [data]);

  const holdPagination = useClientPagination(data?.hold ?? [], {
    initialPageSize: 10,
    resetKey: data?.now,
  });
  const readyPagination = useClientPagination(data?.ready ?? [], {
    initialPageSize: 10,
    resetKey: data?.now,
  });
  const releasedPagination = useClientPagination(data?.released ?? [], {
    initialPageSize: 10,
    resetKey: data?.now,
  });

  const renderViewDetailsButton = (payoutId: string) => (
    <button
      type="button"
      onClick={() => void openDetail(payoutId)}
      className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
    >
      View details
    </button>
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">Payout Operations</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Release held vendor earnings and send payouts via bank transfer from this screen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPayouts()}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : !data ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">On hold</p>
              <p className="mt-1 text-2xl font-bold text-amber-900">{queueCounts.hold}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Ready to release
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{queueCounts.ready}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                Released / sent
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{queueCounts.released}</p>
            </div>
          </div>

          <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">Hold queue</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Held for 7 days after the customer pays, then ready to release. Same for Pickup, Express, and Standard.
              </p>
            </div>
            <div className="responsive-table-shell overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Net payout</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2">Hold until</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hold.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-neutral-500" colSpan={6}>
                        No payouts waiting on hold conditions.
                      </td>
                    </tr>
                  ) : (
                    holdPagination.paginatedItems.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{payout.vendor.label}</td>
                        <td className="px-4 py-3 text-neutral-700">{payout.order.orderNumber}</td>
                        <td className="px-4 py-3 text-neutral-900">
                          {formatMoney(payout.amount, payout.currency)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(payout.createdAt)}</td>
                        <td className="px-4 py-3 text-neutral-700">{formatHoldUntil(payout)}</td>
                        <td className="px-4 py-3">{renderViewDetailsButton(payout.id)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data.hold.length > 0 ? (
              <PaginationFooter
                pageIndex={holdPagination.pageIndex}
                pageCount={holdPagination.pageCount}
                pageSize={holdPagination.pageSize}
                pageSizeOptions={holdPagination.pageSizeOptions}
                onPageIndexChange={holdPagination.setPageIndex}
                onPageSizeChange={holdPagination.setPageSize}
              />
            ) : null}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">Ready queue</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Eligible for release — includes delivered express orders.
              </p>
            </div>
            <div className="responsive-table-shell overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Net payout</th>
                    <th className="px-4 py-2">Hold status</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ready.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-neutral-500" colSpan={5}>
                        No payouts eligible for release.
                      </td>
                    </tr>
                  ) : (
                    readyPagination.paginatedItems.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{payout.vendor.label}</td>
                        <td className="px-4 py-3 text-neutral-700">{payout.order.orderNumber}</td>
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          {formatMoney(payout.amount, payout.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {payout.holdLabel ?? "Ready"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {renderViewDetailsButton(payout.id)}
                            <button
                              type="button"
                              onClick={() => void runAction(payout.id, "release")}
                              disabled={activeActionId === payout.id}
                              className="rounded-lg bg-[#0f3460] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
                            >
                              {activeActionId === payout.id ? "Releasing..." : "Release payout"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data.ready.length > 0 ? (
              <PaginationFooter
                pageIndex={readyPagination.pageIndex}
                pageCount={readyPagination.pageCount}
                pageSize={readyPagination.pageSize}
                pageSizeOptions={readyPagination.pageSizeOptions}
                onPageIndexChange={readyPagination.setPageIndex}
                onPageSizeChange={readyPagination.setPageSize}
              />
            ) : null}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">Released queue</h2>
            </div>
            <div className="responsive-table-shell overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Net payout</th>
                    <th className="px-4 py-2">Released at</th>
                    <th className="px-4 py-2">Sent at</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.released.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-neutral-500" colSpan={7}>
                        No released or sent payouts.
                      </td>
                    </tr>
                  ) : (
                    releasedPagination.paginatedItems.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{payout.vendor.label}</td>
                        <td className="px-4 py-3 text-neutral-700">{payout.order.orderNumber}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${payoutStatusClass(
                              payout.status
                            )}`}
                          >
                            {payoutStatusLabel(payout.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-900">
                          {formatMoney(payout.amount, payout.currency)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(payout.releasedAt)}</td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(payout.sentAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {renderViewDetailsButton(payout.id)}
                            {payout.status === "READY" ? (
                              <button
                                type="button"
                                onClick={() => void runAction(payout.id, "sent")}
                                disabled={activeActionId === payout.id}
                                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                              >
                                {activeActionId === payout.id ? "Marking..." : "Mark sent (bank)"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data.released.length > 0 ? (
              <PaginationFooter
                pageIndex={releasedPagination.pageIndex}
                pageCount={releasedPagination.pageCount}
                pageSize={releasedPagination.pageSize}
                pageSizeOptions={releasedPagination.pageSizeOptions}
                onPageIndexChange={releasedPagination.setPageIndex}
                onPageSizeChange={releasedPagination.setPageSize}
              />
            ) : null}
          </section>
        </>
      )}

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Payout details</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Review vendor bank details and complete the bank transfer from this screen.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="flex min-h-[200px] items-center justify-center px-5 py-10">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : (
              <div className="space-y-5 px-5 py-5">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Vendor</dt>
                    <dd className="mt-1 font-medium text-neutral-900">{detail.vendor.label}</dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Order</dt>
                    <dd className="mt-1 font-medium text-neutral-900">{detail.order.orderNumber}</dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Items subtotal</dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {formatMoney(detail.vendorOrder.subtotalAmount, detail.vendorOrder.currency)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Net payout to vendor</dt>
                    <dd className="mt-1 text-lg font-bold text-[#0f3460]">
                      {formatMoney(detail.amount, detail.currency)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Status</dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {payoutStatusLabel(detail.status)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Vendor order total</dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {formatMoney(detail.vendorOrder.grandTotalAmount, detail.vendorOrder.currency)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Transaction fee</dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {detail.commission
                        ? formatMoney(detail.commission.commissionAmount, detail.commission.currency)
                        : "—"}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Delivery method</dt>
                    <dd className="mt-1 font-medium text-neutral-900">
                      {detail.vendorOrder.deliveryMethod ?? "—"}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Order status</dt>
                    <dd className="mt-1 font-medium text-neutral-900">{detail.vendorOrder.status}</dd>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-neutral-500">Hold until</dt>
                    <dd className="mt-1 font-medium text-neutral-900">{formatHoldUntil(detail)}</dd>
                  </div>
                </dl>

                {detail.lineItems.length > 0 ? (
                  <section className="rounded-xl border border-neutral-200 bg-white">
                    <div className="border-b border-neutral-200 px-4 py-3">
                      <h3 className="text-sm font-semibold text-neutral-900">Order line items</h3>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        SKU-level prices captured when the order was placed.
                      </p>
                    </div>
                    <div className="responsive-table-shell overflow-x-auto">
                      <table className="w-full min-w-[520px] border-collapse text-sm">
                        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
                          <tr>
                            <th className="px-4 py-2">Product</th>
                            <th className="px-4 py-2">SKU / variant</th>
                            <th className="px-4 py-2">Qty</th>
                            <th className="px-4 py-2">Unit</th>
                            <th className="px-4 py-2">Line total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.lineItems.map((item, index) => (
                            <tr key={`${item.productSku ?? item.productName}-${index}`} className="border-t border-neutral-100">
                              <td className="px-4 py-2 text-neutral-900">{item.productName}</td>
                              <td className="px-4 py-2 text-neutral-600">
                                {[item.productSku, item.variantName].filter(Boolean).join(" · ") || "—"}
                              </td>
                              <td className="px-4 py-2 text-neutral-700">{item.quantity}</td>
                              <td className="px-4 py-2 text-neutral-700">
                                {formatMoney(item.unitPriceAmount, item.currency)}
                              </td>
                              <td className="px-4 py-2 font-medium text-neutral-900">
                                {formatMoney(item.lineTotalAmount, item.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}

                <section className="rounded-xl border border-[#0f3460]/20 bg-[#0f3460]/5 p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#0f3460]" />
                    <h3 className="text-sm font-semibold text-[#0f3460]">Send via bank transfer</h3>
                  </div>
                  <p className="mt-2 text-sm text-neutral-600">
                    Transfer the payout amount to the vendor&apos;s bank account below, then mark the
                    payout as sent.
                  </p>

                  {detail.bankDetails?.accountName ||
                  detail.bankDetails?.accountNumberOrIban ||
                  detail.bankDetails?.bankName ? (
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-neutral-500">
                          Account name
                        </dt>
                        <dd className="mt-1 font-medium text-neutral-900">
                          {detail.bankDetails.accountName ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-neutral-500">Bank name</dt>
                        <dd className="mt-1 font-medium text-neutral-900">
                          {detail.bankDetails.bankName ?? "—"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-neutral-500">
                          Account / IBAN
                        </dt>
                        <dd className="mt-1 break-all font-mono text-sm font-medium text-neutral-900">
                          {detail.bankDetails.accountNumberOrIban ?? "—"}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      This vendor has not submitted bank details yet. Ask them to complete payout
                      information in vendor settings before sending funds.
                    </p>
                  )}
                </section>

                <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4">
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Close
                  </button>
                  {detail.status === "ON_HOLD" && detail.eligibleForRelease ? (
                    <button
                      type="button"
                      onClick={() => void runAction(detail.id, "release")}
                      disabled={activeActionId === detail.id}
                      className="rounded-lg bg-[#0f3460] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
                    >
                      {activeActionId === detail.id ? "Releasing..." : "Release payout"}
                    </button>
                  ) : null}
                  {detail.status === "READY" ? (
                    <button
                      type="button"
                      onClick={() => void runAction(detail.id, "sent")}
                      disabled={activeActionId === detail.id}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {activeActionId === detail.id
                        ? "Marking..."
                        : "Mark sent via bank transfer"}
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
