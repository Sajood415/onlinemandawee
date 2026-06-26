"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import type {
  DeliveryMethod,
  DeliveryPriceModel,
  DeliveryRuleScope,
} from "@/domain/delivery/delivery-types";
import { FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR } from "@/lib/platform/transaction-fee";
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

const FIXED_TRANSACTION_FEE_MAJOR = FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR / 100;

const defaultFormState: RuleFormState = {
  method: "STANDARD",
  scope: "GLOBAL",
  vendorProfileId: "",
  countryCode: "",
  priceModel: "FLAT",
  baseFeeAmount: 0,
  deliveryFeeAmount: 0,
  transactionFeeAmount: FIXED_TRANSACTION_FEE_MAJOR,
  perKmRateAmount: "",
  freeAboveAmount: "",
  etaMinDays: 1,
  etaMaxDays: 3,
  isActive: true,
};

const ALL_VENDORS_VALUE = "__ALL_VENDORS__";

function usesTransactionFee(method: DeliveryMethod) {
  return method === "STANDARD" || method === "EXPRESS";
}

function isPickupMethod(method: DeliveryMethod) {
  return method === "PICKUP";
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

function computeRuleName(rule: DeliveryRuleRecord) {
  if (rule.scope === "VENDOR") {
    return `${rule.method} - ${rule.vendorStoreName ?? rule.vendorStoreSlug ?? "Vendor"}`;
  }
  if (rule.scope === "COUNTRY") {
    return `${rule.method} - ${rule.countryCode ?? "Country"}`;
  }
  return `${rule.method} - Global`;
}

function computeRuleValue(rule: DeliveryRuleRecord) {
  if (isPickupMethod(rule.method)) {
    return "No delivery charge";
  }

  if (usesTransactionFee(rule.method)) {
    const deliveryLabel = `$${formatMoney(rule.baseFeeAmount)} delivery`;
    return `${deliveryLabel} · $${FIXED_TRANSACTION_FEE_MAJOR.toFixed(2)} commission / order (fixed)`;
  }

  if (rule.priceModel === "FLAT") {
    return `Flat ${formatMoney(rule.baseFeeAmount)}`;
  }
  if (rule.priceModel === "PER_KM") {
    return `Base ${formatMoney(rule.baseFeeAmount)} + ${formatMoney(rule.perKmRateAmount ?? 0)}/km`;
  }
  return `Base ${formatMoney(rule.baseFeeAmount)} / free above ${formatMoney(
    rule.freeAboveAmount ?? 0
  )}`;
}

export default function AdminDeliveryRulesPage() {
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
      setError(loadError instanceof Error ? loadError.message : "Failed to load delivery rules.");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
      transactionFeeAmount: usesTransactionFee(rule.method)
        ? FIXED_TRANSACTION_FEE_MAJOR
        : minorToMajorDisplay(rule.transactionFeeAmountMinor),
      perKmRateAmount: rule.perKmRateAmount ?? "",
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
    return {
      method: form.method,
      scope: form.scope,
      vendorProfileId: form.scope === "VENDOR" ? vendorProfileId : undefined,
      countryCode: form.scope === "COUNTRY" ? form.countryCode : undefined,
      priceModel: transactionFeeBased || pickupBased ? ("FLAT" as const) : form.priceModel,
      baseFeeAmount: transactionFeeBased
        ? majorToMinor(Number(form.deliveryFeeAmount) || 0)
        : pickupBased
          ? 0
          : form.baseFeeAmount,
      transactionFeeAmountMinor: transactionFeeBased
        ? FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR
        : undefined,
      perKmRateAmount:
        !transactionFeeBased && !pickupBased && form.priceModel === "PER_KM"
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
            `Every vendor already has a ${form.method} vendor-scoped delivery rule.`
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
              createError instanceof Error ? createError.message : `${label}: failed`
            );
          }
        }

        if (createdCount === 0) {
          throw new Error(failures[0] ?? "Could not create delivery rules for vendors.");
        }

        setFormOpen(false);
        setEditingRule(null);
        setForm(defaultFormState);
        await loadRules();

        if (failures.length > 0) {
          setError(
            `Created ${createdCount} rule(s). ${failures.length} vendor(s) failed: ${failures.slice(0, 3).join("; ")}`
          );
        }
        return;
      }

      if (form.scope === "VENDOR" && !form.vendorProfileId) {
        throw new Error("Select a vendor or choose All vendors.");
      }

      if (usesTransactionFee(form.method)) {
        const deliveryFee = Number(form.deliveryFeeAmount);
        if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
          throw new Error("Delivery fee must be zero or greater.");
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
      setError(submitError instanceof Error ? submitError.message : "Failed to save delivery rule.");
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
          transactionFeeAmountMinor: usesTransactionFee(rule.method)
            ? FIXED_PLATFORM_TRANSACTION_FEE_AMOUNT_MINOR
            : rule.transactionFeeAmountMinor ?? undefined,
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
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update rule status.");
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
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete delivery rule.");
    } finally {
      setActionRuleId(null);
    }
  };

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
          <h1 className="text-2xl font-bold text-[#0f3460]">Delivery Rules</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Manage PICKUP, EXPRESS, and STANDARD pricing rules for operational checkout safety.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadRules()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0a2847]"
          >
            <Plus className="h-4 w-4" />
            Create rule
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
            <option value="ALL">All methods</option>
            <option value="PICKUP">PICKUP</option>
            <option value="EXPRESS">EXPRESS</option>
            <option value="STANDARD">STANDARD</option>
          </select>
          <select
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
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
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="responsive-table-shell overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead className="bg-neutral-50">
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-600">
                  <th className="px-4 py-2">Rule Name</th>
                  <th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2">Active</th>
                  <th className="px-4 py-2">Pricing Type</th>
                  <th className="px-4 py-2">Value</th>
                  <th className="px-4 py-2">Vendor Scope</th>
                  <th className="px-4 py-2">Created Date</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-neutral-500" colSpan={8}>
                      No delivery rules match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule.id} className="border-b border-neutral-100">
                      <td className="px-4 py-3 text-neutral-900">{computeRuleName(rule)}</td>
                      <td className="px-4 py-3 text-neutral-700">{rule.method}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            rule.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {rule.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {usesTransactionFee(rule.method)
                          ? "FLAT"
                          : isPickupMethod(rule.method)
                            ? "NONE"
                            : rule.priceModel}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{computeRuleValue(rule)}</td>
                      <td className="px-4 py-3 text-neutral-700">
                        {rule.scope === "GLOBAL"
                          ? "Global"
                          : rule.scope === "COUNTRY"
                            ? `Country (${rule.countryCode ?? "—"})`
                            : rule.vendorStoreName ?? rule.vendorStoreSlug ?? "Vendor"}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{displayDate(rule.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openDetail(rule)}
                            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(rule)}
                            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={actionRuleId === rule.id}
                            onClick={() => void toggleActive(rule)}
                            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                          >
                            {rule.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            disabled={rule.isActive || actionRuleId === rule.id}
                            onClick={() => void deleteRule(rule)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingRule ? "Edit delivery rule" : "Create delivery rule"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-neutral-700">
                Method
                <select
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                  value={form.method}
                  onChange={(event) => {
                    const method = event.target.value as DeliveryMethod;
                    setForm((current) => ({
                      ...current,
                      method,
                      transactionFeeAmount: usesTransactionFee(method)
                        ? FIXED_TRANSACTION_FEE_MAJOR
                        : "",
                      deliveryFeeAmount: usesTransactionFee(method)
                        ? current.deliveryFeeAmount === ""
                          ? 0
                          : current.deliveryFeeAmount
                        : "",
                    }));
                  }}
                >
                  <option value="PICKUP">PICKUP</option>
                  <option value="EXPRESS">EXPRESS</option>
                  <option value="STANDARD">STANDARD</option>
                </select>
              </label>
              <label className="text-sm text-neutral-700">
                Scope
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
                  <option value="GLOBAL">GLOBAL</option>
                  <option value="COUNTRY">COUNTRY</option>
                  <option value="VENDOR">VENDOR</option>
                </select>
              </label>
              {form.scope === "VENDOR" ? (
                <label className="text-sm text-neutral-700 sm:col-span-2">
                  Vendor
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
                    <option value="">Select vendor</option>
                    {!editingRule ? (
                      <option value={ALL_VENDORS_VALUE}>All vendors</option>
                    ) : null}
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.storeName ?? vendor.storeSlug ?? vendor.id}
                      </option>
                    ))}
                  </select>
                  {!editingRule && form.vendorProfileId === ALL_VENDORS_VALUE ? (
                    <span className="mt-1 block text-xs text-neutral-500">
                      Creates one {form.method} rule for each vendor that does not already have one.
                    </span>
                  ) : null}
                </label>
              ) : null}
              {form.scope === "COUNTRY" ? (
                <label className="text-sm text-neutral-700 sm:col-span-2">
                  Country Code
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
              {usesTransactionFee(form.method) ? (
                <>
                  <label className="text-sm text-neutral-700 sm:col-span-2">
                    Delivery fee (USD)
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
                      Customer delivery charge added to each order
                      {form.method === "EXPRESS"
                        ? " (per vendor on multi-vendor express orders)."
                        : " (one fee per order on standard delivery)."}
                    </span>
                  </label>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 sm:col-span-2">
                    <p className="text-sm font-semibold text-neutral-900">
                      Platform commission (fixed)
                    </p>
                    <p className="mt-1 text-sm text-neutral-700">
                      ${FIXED_TRANSACTION_FEE_MAJOR.toFixed(2)} per order for {form.method} delivery
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      This commission is fixed at $3.99 and cannot be changed. It is deducted
                      from vendor payouts and split proportionally on multi-vendor orders.
                    </p>
                  </div>
                </>
              ) : isPickupMethod(form.method) ? (
                <p className="text-sm text-neutral-600 sm:col-span-2">
                  Pickup has no delivery charge. Configure scope and estimated pickup window
                  below.
                </p>
              ) : (
                <>
                  <label className="text-sm text-neutral-700">
                    Pricing Type
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
                      <option value="FLAT">FLAT</option>
                      <option value="PER_KM">PER_KM</option>
                      <option value="FREE_ABOVE">FREE_ABOVE</option>
                    </select>
                  </label>
                  <label className="text-sm text-neutral-700">
                    Base Fee (minor units)
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
                  Per Km Rate (minor units)
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
                  Free Above Amount (minor units)
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
                ETA Min Days
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
                ETA Max Days
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
                Active
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
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitForm()}
                className="rounded-lg bg-[#0f3460] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Saving..." : editingRule ? "Save changes" : "Create rule"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen && selectedRule ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral-900">Rule Detail</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">Rule Name</dt>
                <dd className="font-medium text-neutral-900">{computeRuleName(selectedRule)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Method</dt>
                <dd className="font-medium text-neutral-900">{selectedRule.method}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Active Status</dt>
                <dd className="font-medium text-neutral-900">
                  {selectedRule.isActive ? "ACTIVE" : "INACTIVE"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Scope</dt>
                <dd className="font-medium text-neutral-900">{selectedRule.scope}</dd>
              </div>
              {usesTransactionFee(selectedRule.method) ? (
                <>
                  <div>
                    <dt className="text-neutral-500">Delivery fee</dt>
                    <dd className="font-medium text-neutral-900">
                      ${formatMoney(selectedRule.baseFeeAmount)} per order
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Platform commission</dt>
                    <dd className="font-medium text-neutral-900">
                      ${FIXED_TRANSACTION_FEE_MAJOR.toFixed(2)} per order (fixed)
                    </dd>
                  </div>
                </>
              ) : null}
              {!usesTransactionFee(selectedRule.method) ? (
                <div>
                  <dt className="text-neutral-500">Delivery charge</dt>
                  <dd className="font-medium text-neutral-900">{computeRuleValue(selectedRule)}</dd>
                </div>
              ) : null}
              {!isPickupMethod(selectedRule.method) && !usesTransactionFee(selectedRule.method) ? (
                <div className="sm:col-span-2">
                  <dt className="text-neutral-500">Pricing Type</dt>
                  <dd className="font-medium text-neutral-900">{selectedRule.priceModel}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-neutral-500">ETA</dt>
                <dd className="font-medium text-neutral-900">
                  {selectedRule.etaMinDays} - {selectedRule.etaMaxDays} days
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Country</dt>
                <dd className="font-medium text-neutral-900">{selectedRule.countryCode ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Vendor</dt>
                <dd className="font-medium text-neutral-900">
                  {selectedRule.vendorStoreName ?? selectedRule.vendorStoreSlug ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Created At</dt>
                <dd className="font-medium text-neutral-900">
                  {displayDate(selectedRule.createdAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">Updated At</dt>
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
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
