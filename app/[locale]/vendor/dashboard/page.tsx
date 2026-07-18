"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { Link } from "@/i18n/navigation";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { formatVendorStoreName } from "@/lib/utils/slug";

type DashboardSummary = {
  storeName: string | null;
  storeSlug: string | null;
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
  products: {
    total: number;
    active: number;
    pendingApprovals: number;
  };
  feeEarnings: {
    currency: string;
    orders: Array<{
      id: string;
      orderNumber: string;
      vendorOrderStatus: string;
      paymentStatus: string;
      orderTotal: number;
      currency: string;
      createdAt: string;
    }>;
  };
};

const CLOSED_ORDER_STATUSES = new Set(["DELIVERED", "CANCELLED"]);

const ORDER_STATUS_KEYS = [
  "NEW",
  "PREPARING",
  "INBOUND_SHIPPED",
  "RECEIVED_AT_WAREHOUSE",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

type OrderStatusKey = (typeof ORDER_STATUS_KEYS)[number];

function isOrderStatusKey(status: string): status is OrderStatusKey {
  return (ORDER_STATUS_KEYS as readonly string[]).includes(status);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MetricTile({
  href,
  icon,
  label,
  value,
  sub,
  accentClass,
  badge,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accentClass: string;
  badge?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${accentClass}`}
        >
          {icon}
        </div>
        {badge}
      </div>
      <div className="mt-4 min-w-0">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-neutral-900">
          {value}
        </p>
        {sub ? <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{sub}</p> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-[#0F3460]/25 hover:shadow-md"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">{body}</div>
  );
}

function SkeletonTile() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-neutral-100" />
      <div className="mt-4 space-y-2">
        <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-100" />
        <div className="h-7 w-28 animate-pulse rounded bg-neutral-100" />
        <div className="h-3 w-36 animate-pulse rounded bg-neutral-100" />
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
      setError(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setDataLoading(false);
    }
  }, [t]);

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

  const openOrdersCount = useMemo(() => {
    if (!summary?.feeEarnings?.orders) return 0;
    return summary.feeEarnings.orders.filter(
      (order) => !CLOSED_ORDER_STATUSES.has(order.vendorOrderStatus)
    ).length;
  }, [summary]);

  const recentOrders = useMemo(() => {
    if (!summary?.feeEarnings?.orders) return [];
    return [...summary.feeEarnings.orders]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 5);
  }, [summary]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-500">{t("loading")}</p>
      </div>
    );
  }

  const storeName = summary
    ? formatVendorStoreName(summary.storeName, summary.storeSlug)
    : null;
  const currency = summary?.netEarnings.currency || summary?.recentSales.currency || "USD";
  const available =
    summary?.netEarnings.availableBalance ?? summary?.netEarnings.amount ?? 0;
  const hold = summary?.netEarnings.holdBalance ?? 0;

  return (
    <div className="w-full min-w-0 pb-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
            {dataLoading && !storeName ? (
              <span className="inline-block h-7 w-40 animate-pulse rounded bg-neutral-100" />
            ) : (
              storeName || t("title")
            )}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchSummary()}
          disabled={dataLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${dataLoading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      {error ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dataLoading || !summary ? (
          <>
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
          </>
        ) : (
          <>
            <MetricTile
              href="/vendor/orders"
              accentClass="bg-[#0F3460]"
              icon={<ShoppingCart className="h-5 w-5" />}
              label={t("tiles.openOrders")}
              value={openOrdersCount.toLocaleString()}
              sub={t("tiles.openOrdersSub")}
            />
            <MetricTile
              href="/vendor/reports"
              accentClass="bg-violet-500"
              icon={<TrendingUp className="h-5 w-5" />}
              label={t("tiles.sales30d")}
              value={formatCurrency(summary.recentSales.amount, summary.recentSales.currency)}
              sub={t("tiles.sales30dSub", { count: summary.recentSales.orderCount })}
            />
            <MetricTile
              href="/vendor/reports?tab=payouts"
              accentClass="bg-emerald-600"
              icon={<Wallet className="h-5 w-5" />}
              label={t("tiles.available")}
              value={formatCurrency(available, currency)}
              sub={
                hold > 0
                  ? t("tiles.availableSub", { hold: formatCurrency(hold, currency) })
                  : t("tiles.availableSubNone")
              }
            />
            <MetricTile
              href="/vendor/products"
              accentClass={
                summary.products.pendingApprovals > 0 ? "bg-orange-500" : "bg-neutral-400"
              }
              icon={
                summary.products.pendingApprovals > 0 ? (
                  <Clock className="h-5 w-5" />
                ) : (
                  <Package className="h-5 w-5" />
                )
              }
              label={t("tiles.pendingProducts")}
              value={summary.products.pendingApprovals.toLocaleString()}
              badge={
                summary.products.pendingApprovals > 0 ? (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-orange-200">
                    {t("tiles.needsReview")}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    {t("tiles.allClear")}
                  </span>
                )
              }
              sub={t("tiles.pendingProductsSub", {
                active: summary.products.active,
                total: summary.products.total,
              })}
            />
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/vendor/orders"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0F3460] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a2847]"
        >
          {t("actions.orders")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <Link
          href="/vendor/products"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-[#0F3460]/30 hover:text-[#0F3460]"
        >
          {t("actions.products")}
        </Link>
        <Link
          href="/vendor/reports?tab=fees"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:text-[#0F3460]"
        >
          {t("actions.reports")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold text-neutral-900">{t("recentOrders.title")}</h2>
          <Link
            href="/vendor/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F3460] hover:underline"
          >
            {t("recentOrders.viewAll")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>

        {dataLoading && !summary ? (
          <div className="space-y-3 px-4 py-5 sm:px-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-500 sm:px-5">
            {t("recentOrders.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-start text-sm">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 sm:px-5">{t("recentOrders.order")}</th>
                  <th className="px-4 py-3 sm:px-5">{t("recentOrders.status")}</th>
                  <th className="px-4 py-3 text-end sm:px-5">{t("recentOrders.total")}</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-5">
                    {t("recentOrders.date")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/80">
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-medium text-neutral-900">{order.orderNumber}</p>
                      <p className="text-xs text-neutral-500 sm:hidden">
                        {formatDate(order.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                        {isOrderStatusKey(order.vendorOrderStatus)
                          ? t(`statuses.${order.vendorOrderStatus}`)
                          : order.vendorOrderStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end font-medium text-neutral-900 sm:px-5">
                      {formatCurrency(order.orderTotal, order.currency)}
                    </td>
                    <td className="hidden px-4 py-3 text-neutral-600 sm:table-cell sm:px-5">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
