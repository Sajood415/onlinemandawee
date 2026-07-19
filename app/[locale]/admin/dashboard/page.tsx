"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Building2,
  CreditCard,
  DollarSign,
  Gift,
  RefreshCw,
  Scale,
  ShoppingBag,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { Link } from "@/i18n/navigation";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type SignupPeriod = "7d" | "30d" | "90d";

type AdminDashboardOverview = {
  activeVendorsCount: number;
  customersCount: number;
  newCustomerSignupsCount: number;
  ordersCount: number;
  recentOrdersCount: number;
  grossMerchandiseValue: number;
  totalCommissionAmount: number;
  totalSubscriptionRevenue: number;
  totalGiftRequestRevenue: number;
  paidGiftRequestsCount: number;
  netRevenueAmount: number;
  pendingVendorsCount: number;
  payoutsOnHoldAmount: number;
  openRefundCasesCount: number;
};

function buildPeriodRange(period: SignupPeriod) {
  const to = new Date();
  const from = new Date(to);
  from.setHours(0, 0, 0, 0);

  if (period === "7d") {
    from.setDate(from.getDate() - 7);
  } else if (period === "30d") {
    from.setDate(from.getDate() - 30);
  } else {
    from.setDate(from.getDate() - 90);
  }

  return { from, to };
}

function MetricTile({
  href,
  icon,
  label,
  value,
  sub,
  accentClass,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accentClass: string;
}) {
  const body = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${accentClass}`}
      >
        {icon}
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

export default function AdminDashboardPage() {
  const t = useTranslations("AdminPages.dashboard");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [period, setPeriod] = useState<SignupPeriod>("30d");
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatMoney = useCallback(
    (amountMinor: number) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amountMinor / 100),
    [locale]
  );

  const fetchOverview = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setDataLoading(true);
    setError(null);
    try {
      const { from, to } = buildPeriodRange(period);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const response = await fetch(`/api/admin/reports/overview?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse<AdminDashboardOverview>(response);
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setDataLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchOverview();
    }
  }, [authLoading, user, fetchOverview]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-500">{t("loading")}</p>
      </div>
    );
  }

  const ordersInPeriod = overview?.ordersCount ?? overview?.recentOrdersCount ?? 0;

  return (
    <div className="w-full min-w-0 pb-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="font-medium">{t("period")}</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as SignupPeriod)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
            >
              <option value="7d">{t("periods.7d")}</option>
              <option value="30d">{t("periods.30d")}</option>
              <option value="90d">{t("periods.90d")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void fetchOverview()}
            disabled={dataLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${dataLoading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dataLoading || !overview ? (
          <>
            {Array.from({ length: 12 }).map((_, index) => (
              <SkeletonTile key={index} />
            ))}
          </>
        ) : (
          <>
            <MetricTile
              accentClass="bg-sky-600"
              icon={<DollarSign className="h-5 w-5" />}
              label={t("tiles.fees")}
              value={formatMoney(overview.totalCommissionAmount)}
              sub={t("tiles.feesSub")}
            />
            <MetricTile
              href="/admin/reports?tab=membership"
              accentClass="bg-amber-500"
              icon={<CreditCard className="h-5 w-5" />}
              label={t("tiles.membershipFees")}
              value={formatMoney(overview.totalSubscriptionRevenue)}
              sub={t("tiles.membershipFeesSub")}
            />
            <MetricTile
              href="/admin/gift-requests"
              accentClass="bg-fuchsia-500"
              icon={<Gift className="h-5 w-5" />}
              label={t("tiles.gifts")}
              value={formatMoney(overview.totalGiftRequestRevenue)}
              sub={t("tiles.giftsSub", {
                count: overview.paidGiftRequestsCount.toLocaleString(locale),
              })}
            />
            <MetricTile
              accentClass="bg-emerald-600"
              icon={<DollarSign className="h-5 w-5" />}
              label={t("tiles.allIncome")}
              value={formatMoney(overview.netRevenueAmount)}
              sub={t("tiles.allIncomeSub")}
            />
            <MetricTile
              href="/admin/orders"
              accentClass="bg-[#0F3460]"
              icon={<ShoppingBag className="h-5 w-5" />}
              label={t("tiles.orders")}
              value={ordersInPeriod.toLocaleString(locale)}
              sub={t("tiles.ordersSub")}
            />
            <MetricTile
              href="/admin/reports?tab=salesByCategory"
              accentClass="bg-indigo-500"
              icon={<DollarSign className="h-5 w-5" />}
              label={t("tiles.sales")}
              value={formatMoney(overview.grossMerchandiseValue)}
              sub={t("tiles.salesSub")}
            />
            <MetricTile
              href="/admin/vendors"
              accentClass="bg-emerald-500"
              icon={<UserCheck className="h-5 w-5" />}
              label={t("tiles.activeVendors")}
              value={overview.activeVendorsCount.toLocaleString(locale)}
              sub={t("tiles.activeVendorsSub")}
            />
            <MetricTile
              href="/admin/vendors"
              accentClass={
                overview.pendingVendorsCount > 0 ? "bg-orange-500" : "bg-neutral-400"
              }
              icon={<Building2 className="h-5 w-5" />}
              label={t("tiles.pendingVendors")}
              value={overview.pendingVendorsCount.toLocaleString(locale)}
              sub={t("tiles.pendingVendorsSub")}
            />
            <MetricTile
              accentClass="bg-blue-500"
              icon={<Users className="h-5 w-5" />}
              label={t("tiles.customers")}
              value={overview.customersCount.toLocaleString(locale)}
              sub={t("tiles.customersSub")}
            />
            <MetricTile
              accentClass="bg-violet-500"
              icon={<UserPlus className="h-5 w-5" />}
              label={t("tiles.newSignups")}
              value={overview.newCustomerSignupsCount.toLocaleString(locale)}
              sub={t("tiles.newSignupsSub")}
            />
            <MetricTile
              href="/admin/payouts"
              accentClass="bg-teal-600"
              icon={<Wallet className="h-5 w-5" />}
              label={t("tiles.payoutsHold")}
              value={formatMoney(overview.payoutsOnHoldAmount)}
              sub={t("tiles.payoutsHoldSub")}
            />
            <MetricTile
              href="/admin/disputes"
              accentClass={
                overview.openRefundCasesCount > 0 ? "bg-rose-500" : "bg-neutral-400"
              }
              icon={<Scale className="h-5 w-5" />}
              label={t("tiles.openDisputes")}
              value={overview.openRefundCasesCount.toLocaleString(locale)}
              sub={t("tiles.openDisputesSub")}
            />
          </>
        )}
      </div>
    </div>
  );
}
