"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Ellipsis, Loader2, MapPin, Plus, RefreshCw, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import type {
  DeliveryMethod,
  DeliveryPriceModel,
  DeliveryRuleScope,
} from "@/domain/delivery/delivery-types";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";

/** Matches PLATFORM_DELIVERY_* env defaults (cents → dollars in UI). */
const AF_KM_DEFAULT_BASE_MAJOR = 2;
const AF_KM_DEFAULT_PER_KM_MAJOR = 0.5;

type DeliveryRuleRecord = {
  id: string;
  method: DeliveryMethod;
  scope: DeliveryRuleScope;
  vendorProfileId: string | null;
  vendorStoreSlug: string | null;
  vendorStoreName: string | null;
  countryCode: string | null;
  priceModel: DeliveryPriceModel;
  baseFeeAmount: number;
  transactionFeeAmountMinor: number | null;
  commissionRateBps: number | null;
  perKmRateAmount: number | null;
  freeAboveAmount: number | null;
  etaMinDays: number;
  etaMaxDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AdminRuleScope = Exclude<DeliveryRuleScope, "VENDOR">;

type RuleFormState = {
  method: DeliveryMethod;
  scope: AdminRuleScope;
  countryCode: string;
  priceModel: DeliveryPriceModel;
  deliveryFeeAmount: number | "";
  perKmRateAmount: number | "";
  etaMinDays: number;
  etaMaxDays: number;
  isActive: boolean;
};

const defaultFormState: RuleFormState = {
  method: "STANDARD",
  scope: "GLOBAL",
  countryCode: "",
  priceModel: "FLAT",
  deliveryFeeAmount: 0,
  perKmRateAmount: "",
  etaMinDays: 1,
  etaMaxDays: 3,
  isActive: true,
};

function isPickupMethod(method: DeliveryMethod) {
  return method === "PICKUP";
}

function allowsPerKmPricing(method: DeliveryMethod) {
  return method === "EXPRESS" || method === "STANDARD";
}

function minorToMajorDisplay(amountMinor: number | null | undefined) {
  if (amountMinor == null) return "";
  return Number((amountMinor / 100).toFixed(2));
}

function majorToMinor(amountMajor: number) {
  return Math.round(amountMajor * 100);
}

function formatMoney(amount: number) {
  return (amount / 100).toFixed(2);
}

type DeliveryRulesT = ReturnType<typeof useTranslations<"AdminPages.deliveryRules">>;

function methodLabel(method: DeliveryMethod, t: DeliveryRulesT) {
  return t(`methods.${method}`);
}

function computeRuleName(rule: DeliveryRuleRecord, t: DeliveryRulesT) {
  const method = methodLabel(rule.method, t);
  if (rule.scope === "VENDOR") {
    return `${method} · ${rule.vendorStoreName ?? rule.vendorStoreSlug ?? t("values.vendorFallback")}`;
  }
  if (rule.scope === "COUNTRY") {
    return `${method} · ${rule.countryCode ?? t("values.countryFallback")}`;
  }
  return `${method} · ${t("values.globalSuffix")}`;
}

function computeRuleValue(rule: DeliveryRuleRecord, t: DeliveryRulesT) {
  if (isPickupMethod(rule.method)) {
    return t("values.noCharge");
  }
  if (allowsPerKmPricing(rule.method) && rule.priceModel === "PER_KM") {
    return t("values.basePlusKm", {
      base: formatMoney(rule.baseFeeAmount),
      km: formatMoney(rule.perKmRateAmount ?? 0),
    });
  }
  return t("values.deliveryAmount", { amount: formatMoney(rule.baseFeeAmount) });
}

export default function AdminDeliveryRulesPage() {
  const t = useTranslations("AdminPages.deliveryRules");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [rules, setRules] = useState<DeliveryRuleRecord[]>([]);
  const [warehouseReady, setWarehouseReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickSetupBusy, setQuickSetupBusy] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<"ALL" | DeliveryMethod>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DeliveryRuleRecord | null>(null);
  const [selectedRule, setSelectedRule] = useState<DeliveryRuleRecord | null>(null);
  const [form, setForm] = useState<RuleFormState>(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [actionRuleId, setActionRuleId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<{
    rule: DeliveryRuleRecord;
    x: number;
    y: number;
  } | null>(null);

  const displayDate = useCallback(
    (iso: string) => {
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

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesResponse, settingsResponse] = await Promise.all([
        fetchWithAuth("/api/admin/delivery-rules"),
        fetchWithAuth("/api/admin/platform-settings"),
      ]);
      const [rulesData, settingsData] = await Promise.all([
        parseApiResponse<DeliveryRuleRecord[]>(rulesResponse),
        parseApiResponse<{
          warehouseAddressLine1: string | null;
          warehouseCity: string | null;
          warehouseCountry: string | null;
        }>(settingsResponse),
      ]);
      setRules(rulesData);
      setWarehouseReady(
        Boolean(
          settingsData.warehouseAddressLine1?.trim() &&
            settingsData.warehouseCity?.trim() &&
            settingsData.warehouseCountry?.trim()
        )
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("loadError"));
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const afStandardKmRule = useMemo(
    () =>
      rules.find(
        (rule) =>
          rule.method === "STANDARD" &&
          rule.scope === "COUNTRY" &&
          (rule.countryCode ?? "").toUpperCase() === "AF" &&
          rule.priceModel === "PER_KM"
      ) ?? null,
    [rules]
  );
  const afStandardKmReady = Boolean(afStandardKmRule?.isActive);
  const showAfSetupBanner = !warehouseReady || !afStandardKmReady;

  useEffect(() => {
    if (!authLoading && user) {
      void loadRules();
    }
  }, [authLoading, user, loadRules]);

  useEffect(() => {
    if (!actionMenu) return;
    const close = () => setActionMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [actionMenu]);

  const filteredRules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rules.filter((rule) => {
      if (methodFilter !== "ALL" && rule.method !== methodFilter) return false;
      if (statusFilter === "ACTIVE" && !rule.isActive) return false;
      if (statusFilter === "INACTIVE" && rule.isActive) return false;
      if (!query) return true;

      const haystack = [
        methodLabel(rule.method, t),
        rule.method,
        rule.scope,
        t(`scopes.${rule.scope}`),
        rule.countryCode,
        rule.vendorStoreName,
        rule.vendorStoreSlug,
        computeRuleName(rule, t),
        computeRuleValue(rule, t),
        rule.priceModel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rules, methodFilter, statusFilter, searchQuery, t]);

  const openCreate = () => {
    setEditingRule(null);
    setForm(defaultFormState);
    setFormOpen(true);
  };

  const openEdit = (rule: DeliveryRuleRecord) => {
    if (rule.scope === "VENDOR") {
      setError(t("errors.shopFeeReadOnly"));
      return;
    }
    setEditingRule(rule);
    setForm({
      method: rule.method,
      scope: rule.scope,
      countryCode: rule.countryCode ?? "",
      priceModel: allowsPerKmPricing(rule.method) ? rule.priceModel : "FLAT",
      deliveryFeeAmount: minorToMajorDisplay(rule.baseFeeAmount) || 0,
      perKmRateAmount: allowsPerKmPricing(rule.method)
        ? minorToMajorDisplay(rule.perKmRateAmount)
        : "",
      etaMinDays: rule.etaMinDays,
      etaMaxDays: rule.etaMaxDays,
      isActive: rule.isActive,
    });
    setFormOpen(true);
  };

  const setupAfghanistanKm = async () => {
    if (afStandardKmReady) return;
    setQuickSetupBusy(true);
    setError(null);
    try {
      if (afStandardKmRule && !afStandardKmRule.isActive) {
        const response = await fetchWithAuth(
          `/api/admin/delivery-rules/${afStandardKmRule.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: afStandardKmRule.method,
              scope: afStandardKmRule.scope,
              vendorProfileId: afStandardKmRule.vendorProfileId ?? undefined,
              countryCode: afStandardKmRule.countryCode ?? undefined,
              priceModel: afStandardKmRule.priceModel,
              baseFeeAmount: afStandardKmRule.baseFeeAmount,
              transactionFeeAmountMinor: undefined,
              perKmRateAmount: afStandardKmRule.perKmRateAmount ?? undefined,
              freeAboveAmount: afStandardKmRule.freeAboveAmount ?? undefined,
              etaMinDays: afStandardKmRule.etaMinDays,
              etaMaxDays: afStandardKmRule.etaMaxDays,
              isActive: true,
            }),
          }
        );
        await parseApiResponse(response);
        await loadRules();
        return;
      }
      const response = await fetchWithAuth("/api/admin/delivery-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "STANDARD",
          scope: "COUNTRY",
          countryCode: "AF",
          priceModel: "PER_KM",
          baseFeeAmount: majorToMinor(AF_KM_DEFAULT_BASE_MAJOR),
          perKmRateAmount: majorToMinor(AF_KM_DEFAULT_PER_KM_MAJOR),
          etaMinDays: 1,
          etaMaxDays: 3,
          isActive: true,
        }),
      });
      await parseApiResponse(response);
      await loadRules();
    } catch (setupError) {
      setError(
        setupError instanceof Error ? setupError.message : t("errors.afSetupFailed")
      );
    } finally {
      setQuickSetupBusy(false);
    }
  };

  const openDetail = (rule: DeliveryRuleRecord) => {
    setSelectedRule(rule);
    setDetailOpen(true);
  };

  const buildRulePayload = () => {
    const pickupBased = isPickupMethod(form.method);
    const perKmBased = allowsPerKmPricing(form.method) && form.priceModel === "PER_KM";

    return {
      method: form.method,
      scope: form.scope,
      countryCode: form.scope === "COUNTRY" ? form.countryCode.trim().toUpperCase() : undefined,
      priceModel: pickupBased ? ("FLAT" as const) : perKmBased ? ("PER_KM" as const) : ("FLAT" as const),
      baseFeeAmount: pickupBased ? 0 : majorToMinor(Number(form.deliveryFeeAmount) || 0),
      transactionFeeAmountMinor: undefined,
      perKmRateAmount: perKmBased ? majorToMinor(Number(form.perKmRateAmount) || 0) : undefined,
      freeAboveAmount: undefined,
      etaMinDays: form.etaMinDays,
      etaMaxDays: form.etaMaxDays,
      isActive: form.isActive,
    };
  };

  const submitForm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (form.scope === "COUNTRY" && !form.countryCode.trim()) {
        throw new Error(t("errors.countryRequired"));
      }

      if (!isPickupMethod(form.method)) {
        const deliveryFee = Number(form.deliveryFeeAmount);
        if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
          throw new Error(t("errors.deliveryFeeMin"));
        }
      }

      if (allowsPerKmPricing(form.method) && form.priceModel === "PER_KM") {
        const perKmRate = Number(form.perKmRateAmount);
        if (!Number.isFinite(perKmRate) || perKmRate <= 0) {
          throw new Error(t("errors.perKmMin"));
        }
      }

      const payload = buildRulePayload();
      const endpoint = editingRule
        ? `/api/admin/delivery-rules/${editingRule.id}`
        : "/api/admin/delivery-rules";
      const method = editingRule ? "PATCH" : "POST";
      const response = await fetchWithAuth(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await parseApiResponse(response);
      setFormOpen(false);
      setEditingRule(null);
      setForm(defaultFormState);
      await loadRules();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (rule: DeliveryRuleRecord) => {
    setActionRuleId(rule.id);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/admin/delivery-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: rule.method,
          scope: rule.scope,
          vendorProfileId: rule.vendorProfileId ?? undefined,
          countryCode: rule.countryCode ?? undefined,
          priceModel: rule.priceModel,
          baseFeeAmount: rule.baseFeeAmount,
          transactionFeeAmountMinor: undefined,
          perKmRateAmount: rule.perKmRateAmount ?? undefined,
          freeAboveAmount: rule.freeAboveAmount ?? undefined,
          etaMinDays: rule.etaMinDays,
          etaMaxDays: rule.etaMaxDays,
          isActive: !rule.isActive,
        }),
      });
      await parseApiResponse(response);
      await loadRules();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : t("toggleError"));
    } finally {
      setActionRuleId(null);
    }
  };

  const deleteRule = async (rule: DeliveryRuleRecord) => {
    if (rule.isActive) return;
    setActionRuleId(rule.id);
    setError(null);
    try {
      const response = await fetchWithAuth(`/api/admin/delivery-rules/${rule.id}`, {
        method: "DELETE",
      });
      await parseApiResponse(response);
      await loadRules();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("deleteError"));
    } finally {
      setActionRuleId(null);
    }
  };

  const columns = useMemo<ColumnDef<DeliveryRuleRecord>[]>(
    () => [
      {
        header: t("columns.ruleName"),
        id: "ruleName",
        cell: ({ row }) => (
          <span className="text-neutral-900">{computeRuleName(row.original, t)}</span>
        ),
      },
      {
        header: t("columns.method"),
        accessorKey: "method",
        cell: ({ row }) => methodLabel(row.original.method, t),
      },
      {
        header: t("columns.active"),
        id: "active",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              row.original.isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {row.original.isActive ? t("active") : t("inactive")}
          </span>
        ),
      },
      {
        header: t("columns.pricingType"),
        id: "pricingType",
        cell: ({ row }) => {
          const rule = row.original;
          if (isPickupMethod(rule.method)) return t("pricingTypes.NONE");
          return t(`pricingTypes.${rule.priceModel === "PER_KM" ? "PER_KM" : "FLAT"}`);
        },
      },
      {
        header: t("columns.value"),
        id: "value",
        cell: ({ row }) => computeRuleValue(row.original, t),
      },
      {
        header: t("columns.vendorScope"),
        id: "vendorScope",
        cell: ({ row }) => {
          const rule = row.original;
          if (rule.scope === "GLOBAL") return t("scope.global");
          if (rule.scope === "COUNTRY") {
            return `${t("scope.country")} (${rule.countryCode ?? "—"})`;
          }
          return t("scope.shopFee", {
            shop: rule.vendorStoreName ?? rule.vendorStoreSlug ?? t("scope.vendor"),
          });
        },
      },
      {
        header: t("columns.createdDate"),
        id: "createdDate",
        cell: ({ row }) => displayDate(row.original.createdAt),
      },
      {
        header: t("columns.actions"),
        id: "actions",
        cell: ({ row }) => {
          const rule = row.original;
          return (
            <div
              className="flex justify-end"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label={t("openActions")}
                disabled={actionRuleId === rule.id}
                onClick={(event) => {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  const menuWidth = 180;
                  const menuHeight = 180;
                  setActionMenu({
                    rule,
                    x: Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
                    y: Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8),
                  });
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                <Ellipsis className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [actionRuleId, displayDate, t]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadRules()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">{t("refresh")}</span>
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f3460] px-3 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-[#0a2847]"
          >
            <Plus className="h-4 w-4" />
            {t("createRule")}
          </button>
        </div>
      </div>

      {showAfSetupBanner ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">{t("setup.title")}</p>
          <p className="mt-1 text-amber-900">{t("setup.body")}</p>
          {!warehouseReady ? (
            <p className="mt-2">
              {t("setup.warehouseMissing")}{" "}
              <Link href="/admin/settings" className="font-semibold underline">
                {t("setup.openSettings")}
              </Link>
            </p>
          ) : null}
          {warehouseReady && afStandardKmRule && !afStandardKmRule.isActive ? (
            <button
              type="button"
              disabled={quickSetupBusy}
              onClick={() => void setupAfghanistanKm()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
            >
              {quickSetupBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MapPin className="h-3.5 w-3.5" />
              )}
              {t("setup.activateAfRule")}
            </button>
          ) : null}
          {warehouseReady && !afStandardKmRule ? (
            <button
              type="button"
              disabled={quickSetupBusy}
              onClick={() => void setupAfghanistanKm()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
            >
              {quickSetupBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MapPin className="h-3.5 w-3.5" />
              )}
              {t("setup.createAfRule", {
                base: AF_KM_DEFAULT_BASE_MAJOR.toFixed(2),
                km: AF_KM_DEFAULT_PER_KM_MAJOR.toFixed(2),
              })}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-neutral-300 bg-white py-2 pr-3 pl-9 text-sm text-neutral-700 placeholder:text-neutral-400"
          />
        </label>
        <select
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700"
          value={methodFilter}
          onChange={(event) =>
            setMethodFilter(event.target.value as "ALL" | DeliveryMethod)
          }
        >
          <option value="ALL">{t("allMethods")}</option>
          <option value="PICKUP">{t("methods.PICKUP")}</option>
          <option value="EXPRESS">{t("methods.EXPRESS")}</option>
          <option value="STANDARD">{t("methods.STANDARD")}</option>
        </select>
        <select
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")
          }
        >
          <option value="ALL">{t("allStatuses")}</option>
          <option value="ACTIVE">{t("active")}</option>
          <option value="INACTIVE">{t("inactive")}</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-neutral-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <DataTable
          data={filteredRules}
          columns={columns}
          getRowId={(row) => row.id}
          emptyMessage={t("empty")}
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-3 sm:p-4">
          <div className="flex max-h-[min(92vh,880px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="shrink-0 border-b border-neutral-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                {editingRule ? t("editTitle") : t("createTitle")}
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-neutral-700">
                  {t("form.method")}
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={form.method}
                    onChange={(event) => {
                      const method = event.target.value as DeliveryMethod;
                      setForm((current) => ({
                        ...current,
                        method,
                        priceModel: allowsPerKmPricing(method) ? current.priceModel : "FLAT",
                        deliveryFeeAmount: isPickupMethod(method)
                          ? 0
                          : current.deliveryFeeAmount === ""
                            ? 0
                            : current.deliveryFeeAmount,
                        perKmRateAmount: allowsPerKmPricing(method)
                          ? current.perKmRateAmount
                          : "",
                      }));
                    }}
                  >
                    <option value="PICKUP">{t("methods.PICKUP")}</option>
                    <option value="EXPRESS">{t("methods.EXPRESS")}</option>
                    <option value="STANDARD">{t("methods.STANDARD")}</option>
                  </select>
                </label>

                <label className="text-sm text-neutral-700">
                  {t("form.scope")}
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={form.scope}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scope: event.target.value as AdminRuleScope,
                        countryCode: "",
                      }))
                    }
                  >
                    <option value="GLOBAL">{t("scopes.GLOBAL")}</option>
                    <option value="COUNTRY">{t("scopes.COUNTRY")}</option>
                  </select>
                  <span className="mt-1 block text-xs text-neutral-500">
                    {t("form.scopeHint")}
                  </span>
                </label>

                {form.scope === "COUNTRY" ? (
                  <label className="text-sm text-neutral-700 sm:col-span-2">
                    {t("form.countryCode")}
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase"
                      value={form.countryCode}
                      maxLength={2}
                      placeholder={t("form.countryCodePlaceholder")}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          countryCode: event.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                        }))
                      }
                    />
                    <span className="mt-1 block text-xs text-neutral-500">
                      {t("form.countryCodeHint")}
                    </span>
                  </label>
                ) : null}

                {form.method === "EXPRESS" ? (
                  <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 sm:col-span-2">
                    {t("form.expressAdminNote")}
                  </p>
                ) : null}

                {isPickupMethod(form.method) ? (
                  <p className="text-sm text-neutral-600 sm:col-span-2">{t("form.pickupNote")}</p>
                ) : (
                  <>
                    {allowsPerKmPricing(form.method) ? (
                      <label className="text-sm text-neutral-700 sm:col-span-2">
                        {t("form.pricingType")}
                        <select
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                          value={form.priceModel === "PER_KM" ? "PER_KM" : "FLAT"}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              priceModel: event.target.value as DeliveryPriceModel,
                            }))
                          }
                        >
                          <option value="FLAT">{t("form.flatPerOrder")}</option>
                          <option value="PER_KM">{t("form.perKm")}</option>
                        </select>
                      </label>
                    ) : null}

                    <label className="text-sm text-neutral-700 sm:col-span-2">
                      {form.priceModel === "PER_KM"
                        ? t("form.baseFeeUsd")
                        : t("form.deliveryFeeUsd")}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm text-neutral-500">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                          value={form.deliveryFeeAmount}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              deliveryFeeAmount:
                                event.target.value === "" ? "" : Number(event.target.value),
                            }))
                          }
                        />
                      </div>
                      <span className="mt-1 block text-xs text-neutral-500">
                        {form.priceModel === "PER_KM"
                          ? t("form.baseFeeHint")
                          : form.method === "EXPRESS"
                            ? t("form.deliveryFeeHintExpress")
                            : t("form.deliveryFeeHintStandard")}
                      </span>
                    </label>

                    {form.priceModel === "PER_KM" ? (
                      <label className="text-sm text-neutral-700 sm:col-span-2">
                        {t("form.perKmRateUsd")}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm text-neutral-500">$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                            value={form.perKmRateAmount}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                perKmRateAmount:
                                  event.target.value === "" ? "" : Number(event.target.value),
                              }))
                            }
                          />
                        </div>
                        <span className="mt-1 block text-xs text-neutral-500">
                          {form.method === "STANDARD"
                            ? t("form.perKmHintStandard")
                            : t("form.perKmHintExpress")}
                        </span>
                      </label>
                    ) : null}
                  </>
                )}

                <label className="text-sm text-neutral-700">
                  {t("form.etaMinDays")}
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={form.etaMinDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        etaMinDays: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>
                <label className="text-sm text-neutral-700">
                  {t("form.etaMaxDays")}
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={form.etaMaxDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        etaMaxDays: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>

                <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  {t("form.active")}
                </label>
              </div>
            </div>

            <div className="shrink-0 border-t border-neutral-200 px-5 py-3">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingRule(null);
                  }}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitForm()}
                  className="rounded-lg bg-[#0f3460] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting
                    ? t("saving")
                    : editingRule
                      ? t("saveChanges")
                      : t("createRule")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen && selectedRule ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-3 sm:p-4">
          <div className="flex max-h-[min(92vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="shrink-0 border-b border-neutral-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                {t("detailPanel.title")}
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.ruleName")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {computeRuleName(selectedRule, t)}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.method")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {methodLabel(selectedRule.method, t)}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.activeStatus")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {selectedRule.isActive ? t("active") : t("inactive")}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.scope")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {t(`scopes.${selectedRule.scope}`)}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.deliveryFee")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {computeRuleValue(selectedRule, t)}
                  </dd>
                </div>
                {!isPickupMethod(selectedRule.method) ? (
                  <div>
                    <dt className="text-neutral-500">{t("detailPanel.pricingType")}</dt>
                    <dd className="font-medium text-neutral-900">
                      {t(
                        `pricingTypes.${
                          selectedRule.priceModel === "PER_KM" ? "PER_KM" : "FLAT"
                        }`
                      )}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.eta")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {t("detailPanel.etaDays", {
                      min: selectedRule.etaMinDays,
                      max: selectedRule.etaMaxDays,
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.country")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {selectedRule.countryCode ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.vendor")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {selectedRule.vendorStoreName ?? selectedRule.vendorStoreSlug ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.createdAt")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {displayDate(selectedRule.createdAt)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-neutral-500">{t("detailPanel.updatedAt")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {displayDate(selectedRule.updatedAt)}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="shrink-0 border-t border-neutral-200 px-5 py-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setDetailOpen(false);
                    setSelectedRule(null);
                  }}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {t("close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {actionMenu ? (
        <div
          className="fixed z-70 min-w-[180px] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
          style={{ left: actionMenu.x, top: actionMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
            onClick={() => {
              openDetail(actionMenu.rule);
              setActionMenu(null);
            }}
          >
            {t("details")}
          </button>
          {actionMenu.rule.scope !== "VENDOR" ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
              onClick={() => {
                openEdit(actionMenu.rule);
                setActionMenu(null);
              }}
            >
              {t("edit")}
            </button>
          ) : null}
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
            onClick={() => {
              void toggleActive(actionMenu.rule);
              setActionMenu(null);
            }}
          >
            {actionMenu.rule.isActive ? t("deactivate") : t("activate")}
          </button>
          <button
            type="button"
            disabled={actionMenu.rule.isActive}
            className="block w-full px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-40"
            onClick={() => {
              void deleteRule(actionMenu.rule);
              setActionMenu(null);
            }}
          >
            {t("delete")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
