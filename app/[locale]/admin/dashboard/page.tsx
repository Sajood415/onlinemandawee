"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  DollarSign,
  RefreshCw,
  ShoppingBag,
  UserCheck,
} from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type AdminDashboardOverview = {
  activeVendorsCount: number;
  recentOrdersCount: number;
  grossMerchandiseValue: number;
  totalCommissionAmount: number;
  totalSubscriptionRevenue: number;
  pendingVendorsCount: number;
};

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function MetricCard({
  label,
  value,
  icon,
  accent,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div
        className={`absolute -right-5 -top-5 h-20 w-20 rounded-full opacity-10 ${accent}`}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${accent}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-xs text-neutral-400">{sub}</p> : null}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="h-11 w-11 animate-pulse rounded-xl bg-neutral-100" />
      <div className="mt-4 h-3.5 w-36 animate-pulse rounded bg-neutral-100" />
      <div className="mt-2 h-8 w-32 animate-pulse rounded bg-neutral-100" />
      <div className="mt-2 h-3 w-40 animate-pulse rounded bg-neutral-100" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setDataLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reports/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse<AdminDashboardOverview>(response);
      setOverview(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load admin dashboard data."
      );
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchOverview();
    }
  }, [authLoading, user, fetchOverview]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 pb-16">
      <div className="border-b border-neutral-200 bg-white px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Platform summary and key performance metrics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchOverview()}
            disabled={dataLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${dataLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-8">
        {error ? (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {dataLoading || !overview ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <MetricCard
                label="Total Active Vendors"
                value={overview.activeVendorsCount.toLocaleString()}
                icon={<UserCheck className="h-5 w-5" />}
                accent="bg-emerald-500"
              />
              <MetricCard
                label="Recent Orders (30 days)"
                value={overview.recentOrdersCount.toLocaleString()}
                icon={<ShoppingBag className="h-5 w-5" />}
                accent="bg-blue-500"
              />
              <MetricCard
                label="Total Platform Sales"
                value={formatCurrency(overview.grossMerchandiseValue)}
                icon={<DollarSign className="h-5 w-5" />}
                accent="bg-violet-500"
                sub="Gross merchandise value"
              />
              <MetricCard
                label="Total Transaction Fees Collected"
                value={formatCurrency(overview.totalCommissionAmount)}
                icon={<DollarSign className="h-5 w-5" />}
                accent="bg-[#0f3460]"
                sub="Flat per-order fees"
              />
              <MetricCard
                label="Total Subscription Revenue"
                value={formatCurrency(overview.totalSubscriptionRevenue)}
                icon={<DollarSign className="h-5 w-5" />}
                accent="bg-amber-500"
                sub="Paid membership invoices"
              />
              <MetricCard
                label="Pending Vendor Applications"
                value={overview.pendingVendorsCount.toLocaleString()}
                icon={<Building2 className="h-5 w-5" />}
                accent="bg-orange-500"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
