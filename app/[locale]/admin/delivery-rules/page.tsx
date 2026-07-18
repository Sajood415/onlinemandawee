"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import type {
  DeliveryMethod,
  DeliveryPriceModel,
  DeliveryRuleScope,
} from "@/domain/delivery/delivery-types";
import {
  DEFAULT_COMMISSION_RATE_BPS,
  formatCommissionRateLabel,
  formatCommissionRatePercent,
} from "@/lib/platform/transaction-fee";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";

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

type VendorOption = {
  id: string;
  storeName: string | null;
  storeSlug: string | null;
};

type RuleFormState = {
  method: DeliveryMethod;
  scope: DeliveryRuleScope;
  vendorProfileId: string;
  countryCode: string;
  priceModel: DeliveryPriceModel;
  baseFeeAmount: number;
  deliveryFeeAmount: number | "";
  transactionFeeAmount: number | "";
  perKmRateAmount: number | "";
  freeAboveAmount: number | "";
  etaMinDays: number;
  etaMaxDays: number;
  isActive: boolean;
};

const defaultFormState: RuleFormState = {
  method: "STANDARD",
  scope: "GLOBAL",
  vendorProfileId: "",
  countryCode: "",
  priceModel: "FLAT",
  baseFeeAmount: 0,
  deliveryFeeAmount: 0,
  transactionFeeAmount: "",
  perKmRateAmount: "",
  freeAboveAmount: "",
  etaMinDays: 1,
  etaMaxDays: 3,
  isActive: true,
};

const DEFAULT_COMMISSION_LABEL = formatCommissionRateLabel(DEFAULT_COMMISSION_RATE_BPS);
const DEFAULT_COMMISSION_PERCENT = formatCommissionRatePercent(DEFAULT_COMMISSION_RATE_BPS);

const ALL_VENDORS_VALUE = "__ALL_VENDORS__";

function usesTransactionFee(method: DeliveryMethod) {
  return method === "STANDARD" || method === "EXPRESS";
}

function isPickupMethod(method: DeliveryMethod) {
  return method === "PICKUP";
}

/**
 * EXPRESS and STANDARD let the admin choose between a flat fee and a per-KM
 * rate. For EXPRESS the distance is vendor pickup → customer; for STANDARD
 * it's Mandawee's warehouse → customer (platform items ship via the
 * warehouse), so the rate can be set independently for each.
 */
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

function displayDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
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
    return `${method} - ${rule.vendorStoreName ?? rule.vendorStoreSlug ?? t("values.vendorFallback")}`;
  }
  if (rule.scope === "COUNTRY") {
    return `${method} - ${rule.countryCode ?? t("values.countryFallback")}`;
  }
  return `${method} - ${t("values.globalSuffix")}`;
}

function computeRuleValue(rule: DeliveryRuleRecord, t: DeliveryRulesT) {
  if (isPickupMethod(rule.method)) {
    return t("values.noCharge");
  }

  if (usesTransactionFee(rule.method)) {
    const deliveryLabel =
      allowsPerKmPricing(rule.method) && rule.priceModel === "PER_KM"
        ? t("values.basePlusKm", {
            base: formatMoney(rule.baseFeeAmount),
            km: formatMoney(rule.perKmRateAmount ?? 0),
          })
        : t("values.deliveryAmount", { amount: formatMoney(rule.baseFeeAmount) });
    const commissionLabel =
      rule.commissionRateBps != null
        ? formatCommissionRateLabel(rule.commissionRateBps)
        : DEFAULT_COMMISSION_LABEL;
    return t("values.withCommission", {
      delivery: deliveryLabel,
      commission: commissionLabel,
    });
  }

  if (rule.priceModel === "FLAT") {
    return t("values.flat", { amount: formatMoney(rule.baseFeeAmount) });
  }
  if (rule.priceModel === "PER_KM") {
    return t("values.baseKm", {
      base: formatMoney(rule.baseFeeAmount),
      km: formatMoney(rule.perKmRateAmount ?? 0),
    });
  }
  return t("values.baseFreeAbove", {
    base: formatMoney(rule.baseFeeAmount),
    amount: formatMoney(rule.freeAboveAmount ?? 0),
  });
}

export default function AdminDeliveryRulesPage() {
  const t = useTranslations("AdminPages.deliveryRules");
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [rules, setRules] = useState<DeliveryRuleRecord[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [methodFilter, setMethodFilter] = useState<"ALL" | DeliveryMethod>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DeliveryRuleRecord | null>(null);
  const [selectedRule, setSelectedRule] = useState<DeliveryRuleRecord | null>(null);
  const [form, setForm] = useState<RuleFormState>(defaultFormState);
  const [submitting, setSubmitting] = useState(false);
  const [actionRuleId, setActionRuleId] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesResponse, vendorsResponse] = await Promise.all([
        fetchWithAuth("/api/admin/delivery-rules"),
        fetchWithAuth("/api/admin/vendors"),
      ]);
      const [rulesData, vendorsData] = await Promise.all([
        parseApiResponse<DeliveryRuleRecord[]>(rulesResponse),
        parseApiResponse<VendorOption[]>(vendorsResponse),
      ]);
      setRules(rulesData);
      setVendors(vendorsData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("loadError"));
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadRules();
    }
  }, [authLoading, user, loadRules]);

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (methodFilter !== "ALL" && rule.method !== methodFilter) return false;
      if (statusFilter === "ACTIVE" && !rule.isActive) return false;
      if (statusFilter === "INACTIVE" && rule.isActive) return false;
      return true;
    });
  }, [rules, methodFilter, statusFilter]);

  const openCreate = () => {
    setEditingRule(null);
    setForm(defaultFormState);
    setFormOpen(true);
  };

  const openEdit = (rule: DeliveryRuleRecord) => {
    setEditingRule(rule);
    setForm({
      method: rule.method,
      scope: rule.scope,
      vendorProfileId: rule.vendorProfileId ?? "",
      countryCode: rule.countryCode ?? "",
      priceModel: rule.priceModel,
      baseFeeAmount: rule.baseFeeAmount,
      deliveryFeeAmount: minorToMajorDisplay(rule.baseFeeAmount),
      transactionFeeAmount: "",
      perKmRateAmount: allowsPerKmPricing(rule.method)
        ? minorToMajorDisplay(rule.perKmRateAmount)
        : (rule.perKmRateAmount ?? ""),
      freeAboveAmount: rule.freeAboveAmount ?? "",
      etaMinDays: rule.etaMinDays,
      etaMaxDays: rule.etaMaxDays,
      isActive: rule.isActive,
    });
    setFormOpen(true);
  };

  const openDetail = (rule: DeliveryRuleRecord) => {
    setSelectedRule(rule);
    setDetailOpen(true);
  };

  const buildRulePayload = (vendorProfileId?: string) => {
    const transactionFeeBased = usesTransactionFee(form.method);
    const pickupBased = isPickupMethod(form.method);
    const perKmBased = allowsPerKmPricing(form.method) && form.priceModel === "PER_KM";

    return {
      method: form.method,
      scope: form.scope,
      vendorProfileId: form.scope === "VENDOR" ? vendorProfileId : undefined,
      countryCode: form.scope === "COUNTRY" ? form.countryCode : undefined,
      priceModel: perKmBased
        ? ("PER_KM" as const)
        : transactionFeeBased || pickupBased
          ? ("FLAT" as const)
          : form.priceModel,
      baseFeeAmount: transactionFeeBased
        ? majorToMinor(Number(form.deliveryFeeAmount) || 0)
        : pickupBased
          ? 0
          : form.baseFeeAmount,
      transactionFeeAmountMinor: undefined,
      perKmRateAmount: perKmBased
        ? majorToMinor(Number(form.perKmRateAmount) || 0)
        : !transactionFeeBased && !pickupBased && form.priceModel === "PER_KM"
          ? Number(form.perKmRateAmount)
          : undefined,
      freeAboveAmount:
        !transactionFeeBased && !pickupBased && form.priceModel === "FREE_ABOVE"
          ? Number(form.freeAboveAmount)
          : undefined,
      etaMinDays: form.etaMinDays,
      etaMaxDays: form.etaMaxDays,
      isActive: form.isActive,
    };
  };

  const submitForm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (
        !editingRule &&
        form.scope === "VENDOR" &&
        form.vendorProfileId === ALL_VENDORS_VALUE
      ) {
        const vendorsWithoutRule = vendors.filter(
          (vendor) =>
            !rules.some(
              (rule) =>
                rule.scope === "VENDOR" &&
                rule.method === form.method &&
                rule.vendorProfileId === vendor.id
            )
        );

        if (vendorsWithoutRule.length === 0) {
          throw new Error(
            t("errors.everyVendorHasRule", { method: methodLabel(form.method, t) })
          );
        }

        let createdCount = 0;
        const failures: string[] = [];

        for (const vendor of vendorsWithoutRule) {
          try {
            const response = await fetchWithAuth("/api/admin/delivery-rules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(buildRulePayload(vendor.id)),
            });
            await parseApiResponse(response);
            createdCount += 1;
          } catch (createError) {
            const label = vendor.storeName ?? vendor.storeSlug ?? vendor.id;
            failures.push(
              createError instanceof Error
                ? createError.message
                : t("errors.labelFailed", { label })
            );
          }
        }

        if (createdCount === 0) {
          throw new Error(failures[0] ?? t("errors.createVendorsFailed"));
        }

        setFormOpen(false);
        setEditingRule(null);
        setForm(defaultFormState);
        await loadRules();

        if (failures.length > 0) {
          setError(
            t("errors.createdPartial", {
              created: createdCount,
              failed: failures.length,
              details: failures.slice(0, 3).join("; "),
            })
          );
        }
        return;
      }

      if (form.scope === "VENDOR" && !form.vendorProfileId) {
        throw new Error(t("errors.selectVendor"));
      }

      if (usesTransactionFee(form.method)) {
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

      const payload = buildRulePayload(
        form.scope === "VENDOR" ? form.vendorProfileId : undefined
      );

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

  /**
   * Vendor-scoped rules always take priority over GLOBAL/COUNTRY rules for
   * that vendor's orders (see findBestMatchingDeliveryRule), so when an admin
   * is editing a GLOBAL or COUNTRY rule we surface any active vendor
   * overrides for the same method — otherwise the admin's change silently
   * has no effect for those vendors.
   */
  const vendorOverridesForMethod = useMemo(() => {
    return rules.filter(
      (rule) =>
        rule.scope === "VENDOR" &&
        rule.method === form.method &&
        rule.isActive &&
        rule.id !== editingRule?.id
    );
  }, [rules, form.method, editingRule]);

  const deactivateVendorOverrides = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const failures: string[] = [];
      for (const rule of vendorOverridesForMethod) {
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
              isActive: false,
            }),
          });
          await parseApiResponse(response);
        } catch (deactivateError) {
          const label = rule.vendorStoreName ?? rule.vendorStoreSlug ?? rule.id;
          failures.push(
            deactivateError instanceof Error
              ? `${label}: ${deactivateError.message}`
              : t("errors.labelFailed", { label })
          );
        }
      }
      await loadRules();
      if (failures.length > 0) {
        setError(
          t("errors.deactivateOverridesFailed", {
            details: failures.slice(0, 3).join("; "),
          })
        );
      }
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

  const deleteAllRules = async () => {
    if (rules.length === 0) return;

    const confirmed = window.confirm(t("deleteAllConfirm", { count: rules.length }));
    if (!confirmed) return;

    setActionRuleId("__ALL__");
    setError(null);
    try {
      const response = await fetchWithAuth("/api/admin/delivery-rules", {
        method: "DELETE",
      });
      await parseApiResponse(response);
      await loadRules();
    } catch (deleteAllError) {
      setError(
        deleteAllError instanceof Error ? deleteAllError.message : t("deleteAllError")
      );
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
          if (usesTransactionFee(rule.method)) {
            return allowsPerKmPricing(rule.method)
              ? t(`pricingTypes.${rule.priceModel}`)
              : t("pricingTypes.FLAT");
          }
          return isPickupMethod(rule.method)
            ? t("pricingTypes.NONE")
            : t(`pricingTypes.${rule.priceModel}`);
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
          return rule.scope === "GLOBAL"
            ? t("scope.global")
            : rule.scope === "COUNTRY"
              ? `${t("scope.country")} (${rule.countryCode ?? "—"})`
              : rule.vendorStoreName ?? rule.vendorStoreSlug ?? t("scope.vendor");
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
              className="flex flex-wrap gap-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => openDetail(rule)}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {t("details")}
              </button>
              <button
                type="button"
                onClick={() => openEdit(rule)}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {t("edit")}
              </button>
              <button
                type="button"
                disabled={actionRuleId === rule.id}
                onClick={() => void toggleActive(rule)}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {rule.isActive ? t("deactivate") : t("activate")}
              </button>
              <button
                type="button"
                disabled={rule.isActive || actionRuleId === rule.id}
                onClick={() => void deleteRule(rule)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                {t("delete")}
              </button>
            </div>
          );
        },
      },
    ],
    [actionRuleId, t]
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
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadRules()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </button>
          <button
            type="button"
            disabled={rules.length === 0 || actionRuleId === "__ALL__"}
            onClick={() => void deleteAllRules()}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {t("deleteAll")}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0a2847]"
          >
            <Plus className="h-4 w-4" />
            {t("createRule")}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
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
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
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
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingRule ? t("editTitle") : t("createTitle")}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                      transactionFeeAmount: "",
                      deliveryFeeAmount: usesTransactionFee(method)
                        ? current.deliveryFeeAmount === ""
                          ? 0
                          : current.deliveryFeeAmount
                        : "",
                      perKmRateAmount: allowsPerKmPricing(method) ? current.perKmRateAmount : "",
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
                      scope: event.target.value as DeliveryRuleScope,
                      vendorProfileId: "",
                      countryCode: "",
                    }))
                  }
                >
                  <option value="GLOBAL">{t("scopes.GLOBAL")}</option>
                  <option value="COUNTRY">{t("scopes.COUNTRY")}</option>
                  <option value="VENDOR">{t("scopes.VENDOR")}</option>
                </select>
              </label>
              {form.scope === "VENDOR" ? (
                <label className="text-sm text-neutral-700 sm:col-span-2">
                  {t("form.vendor")}
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                    value={form.vendorProfileId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        vendorProfileId: event.target.value,
                      }))
                    }
                  >
                    <option value="">{t("form.selectVendor")}</option>
                    {!editingRule ? (
                      <option value={ALL_VENDORS_VALUE}>{t("form.allVendors")}</option>
                    ) : null}
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.storeName ?? vendor.storeSlug ?? vendor.id}
                      </option>
                    ))}
                  </select>
                  {!editingRule && form.vendorProfileId === ALL_VENDORS_VALUE ? (
                    <span className="mt-1 block text-xs text-neutral-500">
                      {t("form.allVendorsHint", { method: methodLabel(form.method, t) })}
                    </span>
                  ) : null}
                </label>
              ) : null}
              {form.scope === "COUNTRY" ? (
                <label className="text-sm text-neutral-700 sm:col-span-2">
                  {t("form.countryCode")}
                  <input
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase"
                    value={form.countryCode}
                    maxLength={3}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        countryCode: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </label>
              ) : null}
              {form.scope !== "VENDOR" && vendorOverridesForMethod.length > 0 ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:col-span-2">
                  <p className="font-semibold">
                    {t("overrides.title", {
                      count: vendorOverridesForMethod.length,
                      method: methodLabel(form.method, t),
                      scope: t(`scopes.${form.scope}`),
                    })}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    {t("overrides.body", {
                      scopeLabel:
                        form.scope === "GLOBAL"
                          ? t("overrides.global")
                          : t("overrides.country"),
                      vendors: vendorOverridesForMethod
                        .map(
                          (rule) =>
                            rule.vendorStoreName ??
                            rule.vendorStoreSlug ??
                            t("overrides.aVendor")
                        )
                        .join(", "),
                    })}
                  </p>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void deactivateVendorOverrides()}
                    className="mt-2 rounded-lg border border-amber-400 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                  >
                    {t("overrides.deactivate", {
                      count: vendorOverridesForMethod.length,
                    })}
                  </button>
                </div>
              ) : null}
              {usesTransactionFee(form.method) ? (
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
                    {allowsPerKmPricing(form.method) && form.priceModel === "PER_KM"
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
                      {allowsPerKmPricing(form.method) && form.priceModel === "PER_KM"
                        ? t("form.baseFeeHint")
                        : form.method === "EXPRESS"
                          ? t("form.deliveryFeeHintExpress")
                          : t("form.deliveryFeeHintStandard")}
                    </span>
                  </label>
                  {allowsPerKmPricing(form.method) && form.priceModel === "PER_KM" ? (
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
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 sm:col-span-2">
                    <p className="text-sm font-semibold text-neutral-900">
                      {t("form.platformCommission")}
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">
                      {t("form.commissionOfSales", { percent: DEFAULT_COMMISSION_PERCENT })}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">{t("form.commissionNote")}</p>
                  </div>
                </>
              ) : isPickupMethod(form.method) ? (
                <p className="text-sm text-neutral-600 sm:col-span-2">{t("form.pickupNote")}</p>
              ) : (
                <>
                  <label className="text-sm text-neutral-700">
                    {t("form.pricingType")}
                    <select
                      className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                      value={form.priceModel}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          priceModel: event.target.value as DeliveryPriceModel,
                          perKmRateAmount:
                            event.target.value === "PER_KM" ? current.perKmRateAmount : "",
                          freeAboveAmount:
                            event.target.value === "FREE_ABOVE" ? current.freeAboveAmount : "",
                        }))
                      }
                    >
                      <option value="FLAT">{t("pricingTypes.FLAT")}</option>
                      <option value="PER_KM">{t("pricingTypes.PER_KM")}</option>
                      <option value="FREE_ABOVE">{t("pricingTypes.FREE_ABOVE")}</option>
                    </select>
                  </label>
                  <label className="text-sm text-neutral-700">
                    {t("form.baseFeeMinor")}
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      value={form.baseFeeAmount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          baseFeeAmount: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </label>
                </>
              )}
              {!usesTransactionFee(form.method) &&
              !isPickupMethod(form.method) &&
              form.priceModel === "PER_KM" ? (
                <label className="text-sm text-neutral-700">
                  {t("form.perKmMinor")}
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={form.perKmRateAmount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        perKmRateAmount: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>
              ) : null}
              {!usesTransactionFee(form.method) &&
              !isPickupMethod(form.method) &&
              form.priceModel === "FREE_ABOVE" ? (
                <label className="text-sm text-neutral-700">
                  {t("form.freeAboveMinor")}
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={form.freeAboveAmount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        freeAboveAmount: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>
              ) : null}
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
            <div className="mt-5 flex justify-end gap-2">
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
      ) : null}

      {detailOpen && selectedRule ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">
              {t("detailPanel.title")}
            </h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
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
              {usesTransactionFee(selectedRule.method) ? (
                <>
                  <div>
                    <dt className="text-neutral-500">{t("detailPanel.deliveryFee")}</dt>
                    <dd className="font-medium text-neutral-900">
                      {allowsPerKmPricing(selectedRule.method) &&
                      selectedRule.priceModel === "PER_KM"
                        ? t("values.basePlusKm", {
                            base: formatMoney(selectedRule.baseFeeAmount),
                            km: formatMoney(selectedRule.perKmRateAmount ?? 0),
                          })
                        : t("values.perOrder", {
                            amount: formatMoney(selectedRule.baseFeeAmount),
                          })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">
                      {t("detailPanel.platformCommission")}
                    </dt>
                    <dd className="font-medium text-neutral-900">
                      {selectedRule.commissionRateBps != null
                        ? formatCommissionRateLabel(selectedRule.commissionRateBps)
                        : DEFAULT_COMMISSION_LABEL}{" "}
                      {t("values.ofSale")}
                    </dd>
                  </div>
                  {allowsPerKmPricing(selectedRule.method) ? (
                    <div>
                      <dt className="text-neutral-500">{t("detailPanel.pricingType")}</dt>
                      <dd className="font-medium text-neutral-900">
                        {t(`pricingTypes.${selectedRule.priceModel}`)}
                      </dd>
                    </div>
                  ) : null}
                </>
              ) : null}
              {!usesTransactionFee(selectedRule.method) ? (
                <div>
                  <dt className="text-neutral-500">{t("detailPanel.deliveryCharge")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {computeRuleValue(selectedRule, t)}
                  </dd>
                </div>
              ) : null}
              {!isPickupMethod(selectedRule.method) && !usesTransactionFee(selectedRule.method) ? (
                <div className="sm:col-span-2">
                  <dt className="text-neutral-500">{t("detailPanel.pricingType")}</dt>
                  <dd className="font-medium text-neutral-900">
                    {t(`pricingTypes.${selectedRule.priceModel}`)}
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
            <div className="mt-5 flex justify-end">
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
      ) : null}
    </div>
  );
}
