"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type AdminPayoutItem = {
  id: string;
  status: "ON_HOLD" | "READY" | "SENT" | "FAILED";
  amount: number;
  currency: string;
  holdUntil: string;
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
    orderId: string;
    orderNumber: string;
  };
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

export default function AdminPayoutsPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");

  const [data, setData] = useState<AdminPayoutQueuesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth("/api/admin/payouts");
      const payload = await parseApiResponse<AdminPayoutQueuesResponse>(response);
      setData(payload);
      if (!selectedId && payload.hold[0]) {
        setSelectedId(payload.hold[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payouts.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadPayouts();
    }
  }, [authLoading, user, loadPayouts]);

  const runAction = useCallback(
    async (payoutId: string, type: "release" | "sent") => {
      if (activeActionId) return;
      setActiveActionId(payoutId);
      setError(null);
      try {
        const endpoint = type === "release" ? "/api/admin/payouts/release" : "/api/admin/payouts/sent";
        const res = await fetchWithAuth(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payoutId }),
        });
        await parseApiResponse(res);
        await loadPayouts();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Payout action failed.");
      } finally {
        setActiveActionId(null);
      }
    },
    [activeActionId, loadPayouts]
  );

  const allPayouts = useMemo(() => {
    if (!data) return [];
    return [...data.hold, ...data.ready, ...data.released];
  }, [data]);

  const selected = allPayouts.find((item) => item.id === selectedId) ?? null;

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
            Operational release workflow for held vendor payouts.
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
          <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">Hold queue</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2">Hold until</th>
                    <th className="px-4 py-2">Eligible</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hold.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-neutral-500" colSpan={7}>
                        No payouts in hold queue.
                      </td>
                    </tr>
                  ) : (
                    data.hold.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{payout.vendor.label}</td>
                        <td className="px-4 py-3 text-neutral-700">{payout.order.orderNumber}</td>
                        <td className="px-4 py-3 text-neutral-900">
                          {formatMoney(payout.amount, payout.currency)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(payout.createdAt)}</td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(payout.holdUntil)}</td>
                        <td className="px-4 py-3">
                          {payout.eligibleForRelease ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Waiting
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(payout.id)}
                            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">Ready queue</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Hold until</th>
                    <th className="px-4 py-2">Action</th>
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
                    data.ready.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{payout.vendor.label}</td>
                        <td className="px-4 py-3 text-neutral-700">{payout.order.orderNumber}</td>
                        <td className="px-4 py-3 text-neutral-900">
                          {formatMoney(payout.amount, payout.currency)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(payout.holdUntil)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void runAction(payout.id, "release")}
                            disabled={activeActionId === payout.id}
                            className="rounded-lg bg-[#0f3460] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
                          >
                            {activeActionId === payout.id ? "Releasing..." : "Release payout"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-900">Released queue</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-neutral-50">
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Released at</th>
                    <th className="px-4 py-2">Sent at</th>
                    <th className="px-4 py-2">Action</th>
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
                    data.released.map((payout) => (
                      <tr key={payout.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 text-neutral-900">{payout.vendor.label}</td>
                        <td className="px-4 py-3 text-neutral-700">{payout.order.orderNumber}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${payoutStatusClass(
                              payout.status
                            )}`}
                          >
                            {payout.status === "READY" ? "RELEASED" : payout.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-900">
                          {formatMoney(payout.amount, payout.currency)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(payout.releasedAt)}</td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(payout.sentAt)}</td>
                        <td className="px-4 py-3">
                          {payout.status === "READY" ? (
                            <button
                              type="button"
                              onClick={() => void runAction(payout.id, "sent")}
                              disabled={activeActionId === payout.id}
                              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                            >
                              {activeActionId === payout.id ? "Marking..." : "Mark sent"}
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-500">Sent</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">Payout details</h2>
            {!selected ? (
              <p className="mt-2 text-sm text-neutral-500">Select a payout to inspect details.</p>
            ) : (
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">Vendor</dt>
                  <dd className="mt-1 font-medium text-neutral-900">{selected.vendor.label}</dd>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">Order</dt>
                  <dd className="mt-1 font-medium text-neutral-900">{selected.order.orderNumber}</dd>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">Payout amount</dt>
                  <dd className="mt-1 font-medium text-neutral-900">
                    {formatMoney(selected.amount, selected.currency)}
                  </dd>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">Status</dt>
                  <dd className="mt-1 font-medium text-neutral-900">
                    {selected.status === "READY" ? "RELEASED" : selected.status}
                  </dd>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">Hold until</dt>
                  <dd className="mt-1 font-medium text-neutral-900">{formatDate(selected.holdUntil)}</dd>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">Released at</dt>
                  <dd className="mt-1 font-medium text-neutral-900">
                    {formatDate(selected.releasedAt)}
                  </dd>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-neutral-500">Sent at</dt>
                  <dd className="mt-1 font-medium text-neutral-900">{formatDate(selected.sentAt)}</dd>
                </div>
              </dl>
            )}
          </section>
        </>
      )}
    </div>
  );
}
