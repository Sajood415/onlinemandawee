"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  TrendingUp,
  Wallet,
  CreditCard,
  Clock,
  Package,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Minus,
} from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { FeeEarningsDashboard } from "@/components/vendor/FeeEarningsDashboard";
import { Link } from "@/i18n/navigation";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { formatVendorStoreName } from "@/lib/utils/slug";

type DashboardSummary = {
  storeName: string | null;
  storeSlug: string | null;
  vendorStatus: string;
  totalOrders: number;
  recentSales: {
    amount: number;
    currency: string;
    periodDays: number;
    orderCount: number;
  };
  netEarnings: {
    amount: number;
    currency: string;
    holdBalance?: number;
    availableBalance?: number;
  };
  subscription: {
    status: string;
    trialEndsAt: string | null;
    isInTrial: boolean;
    overdueMonths: number;
    alertLevel: "none" | "warning" | "critical" | "suspended";
    shopSuspendedForBilling: boolean;
    gracePeriodEndsAt: string | null;
    failedPaymentCount: number;
    latestInvoiceDueAt: string | null;
    latestInvoicePeriodStart: string | null;
  };
  products: {
    total: number;
    active: number;
    pendingApprovals: number;
  };
  feeEarnings: {
    currency: string;
    transactionFeeAmountMinor: number;
    transactionFeeLabel: string;
    subscription: {
      monthlyAmount: number;
      currency: string;
      status: string;
      periodLabel: string | null;
      dueAt: string | null;
      invoiceAmount: number;
    };
    orders: Array<{
      id: string;
      orderNumber: string;
      vendorOrderStatus: string;
      paymentStatus: string;
      orderTotal: number;
      transactionFee: number | null;
      netEarnings: number | null;
      currency: string;
      isSettled: boolean;
      createdAt: string;
    }>;
    totals: {
      settledOrderCount: number;
      orderTotal: number;
      transactionFees: number;
      netEarnings: number;
    };
  };
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function SubscriptionBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Active
      </span>
    );
  }
  if (status === "TRIAL") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
        <Clock className="h-3.5 w-3.5" />
        Trial
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
        <AlertCircle className="h-3.5 w-3.5" />
        Payment failed
      </span>
    );
  }
  if (status === "SUSPENDED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
        <XCircle className="h-3.5 w-3.5" />
        Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 ring-1 ring-neutral-200">
      <Minus className="h-3.5 w-3.5" />
      No invoice
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  accent,
  badge,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent: string;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${className ?? ""}`}
    >
      <div className={`absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full opacity-[0.07] ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${accent}`}
        >
          {icon}
        </div>
        {badge}
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          {value}
        </p>
        {sub && (
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{sub}</p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm ${className ?? ""}`}
    >
      <div className="h-11 w-11 animate-pulse rounded-xl bg-neutral-100" />
      <div className="flex flex-col gap-2">
        <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-100" />
        <div className="h-8 w-32 animate-pulse rounded bg-neutral-100" />
        <div className="h-3 w-40 animate-pulse rounded bg-neutral-100" />
      </div>
    </div>
  );
}

export default function VendorDashboardPage() {
  const t = useTranslations("VendorPages.dashboard");
  const { isLoading: authLoading, user } = useDashboardGuard("VENDOR");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setDataLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse<DashboardSummary>(res);
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard data.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchSummary();
    }
  }, [authLoading, user, fetchSummary]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && user && !authLoading) {
        void fetchSummary();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [authLoading, user, fetchSummary]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  const storeName = summary
    ? formatVendorStoreName(summary.storeName, summary.storeSlug)
    : null;

  return (
    <div className="min-h-screen w-full bg-neutral-50 pb-16">
      {/* Page header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              {dataLoading && !storeName ? (
                <span className="inline-block h-8 w-48 animate-pulse rounded bg-neutral-100" />
              ) : storeName ? (
                storeName
              ) : (
                t("title")
              )}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchSummary()}
            disabled={dataLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${dataLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-8">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Metric tiles */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-6">
          {dataLoading || !summary ? (
            <>
              <SkeletonCard className="xl:col-span-2" />
              <SkeletonCard className="xl:col-span-2" />
              <SkeletonCard className="xl:col-span-2" />
              <SkeletonCard className="xl:col-span-3" />
              <SkeletonCard className="xl:col-span-3" />
            </>
          ) : (
            <>
              {/* Total orders */}
              <MetricCard
                accent="bg-blue-500"
                className="xl:col-span-2"
                icon={<ShoppingCart className="h-5 w-5" />}
                label="Total Orders"
                value={summary.totalOrders.toLocaleString()}
                sub="All orders placed with your store"
              />

              {/* Recent sales */}
              <MetricCard
                accent="bg-violet-500"
                className="xl:col-span-2"
                icon={<TrendingUp className="h-5 w-5" />}
                label="Recent Sales (30 days)"
                value={formatCurrency(
                  summary.recentSales.amount,
                  summary.recentSales.currency
                )}
                sub={`${summary.recentSales.orderCount} order${summary.recentSales.orderCount !== 1 ? "s" : ""} in the last 30 days`}
              />

              {/* Net earnings */}
              <MetricCard
                accent="bg-emerald-500"
                className="xl:col-span-2"
                icon={<Wallet className="h-5 w-5" />}
                label="Net Earnings"
                value={formatCurrency(
                  summary.netEarnings.amount,
                  summary.netEarnings.currency
                )}
                sub={
                  summary.netEarnings.holdBalance != null
                    ? `${formatCurrency(summary.netEarnings.holdBalance, summary.netEarnings.currency)} on hold · ${formatCurrency(summary.netEarnings.availableBalance ?? 0, summary.netEarnings.currency)} available`
                    : `After ${summary.feeEarnings.transactionFeeLabel}; includes hold + available`
                }
              />

              {/* Subscription status */}
              <MetricCard
                accent="bg-amber-500"
                className="xl:col-span-3"
                icon={<CreditCard className="h-5 w-5" />}
                label="Subscription"
                value={
                  summary.subscription.status === "ACTIVE"
                    ? "Active"
                    : summary.subscription.status === "TRIAL"
                      ? "Trial"
                      : summary.subscription.status === "FAILED"
                        ? "Payment Failed"
                        : summary.subscription.status === "SUSPENDED"
                          ? "Suspended"
                        : "No Invoice"
                }
                badge={<SubscriptionBadge status={summary.subscription.status} />}
                sub={
                  summary.subscription.status === "TRIAL"
                    ? summary.subscription.trialEndsAt
                      ? `Trial ends ${new Date(summary.subscription.trialEndsAt).toLocaleDateString()}`
                      : "Trial active"
                    : summary.subscription.status === "FAILED"
                      ? summary.subscription.gracePeriodEndsAt
                        ? `Grace period ends ${new Date(summary.subscription.gracePeriodEndsAt).toLocaleDateString()} · Failed attempts: ${summary.subscription.failedPaymentCount}`
                        : `Payment failed · Failed attempts: ${summary.subscription.failedPaymentCount}`
                      : summary.subscription.status === "SUSPENDED"
                        ? "Store hidden from customers until payment succeeds"
                        : summary.subscription.latestInvoicePeriodStart
                          ? `Period from ${new Date(
                              summary.subscription.latestInvoicePeriodStart
                            ).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                          : "No active membership invoice"
                }
              />

              {/* Pending product approvals */}
              <MetricCard
                accent={
                  summary.products.pendingApprovals > 0
                    ? "bg-orange-500"
                    : "bg-neutral-400"
                }
                className="xl:col-span-3"
                icon={
                  summary.products.pendingApprovals > 0 ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <Package className="h-5 w-5" />
                  )
                }
                label="Pending Approvals"
                value={summary.products.pendingApprovals.toLocaleString()}
                badge={
                  summary.products.pendingApprovals > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                      Needs review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      All clear
                    </span>
                  )
                }
                sub={`${summary.products.active} active · ${summary.products.total} total products`}
              />
            </>
          )}
        </div>

        {summary?.feeEarnings ? (
          <FeeEarningsDashboard data={summary.feeEarnings} />
        ) : null}

        {/* Quick links */}
        {summary && (
          <div className="mt-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Quick actions
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "View all orders", href: "/vendor/orders", icon: <ShoppingCart className="h-4 w-4" /> },
                { label: "Manage products", href: "/vendor/products", icon: <Package className="h-4 w-4" /> },
                { label: "Payout history", href: "/vendor/reports?tab=payouts", icon: <Wallet className="h-4 w-4" /> },
                { label: "Sales reports", href: "/vendor/reports", icon: <TrendingUp className="h-4 w-4" /> },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  <span className="text-neutral-400">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
