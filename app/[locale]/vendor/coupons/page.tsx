"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Tag, X } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type CouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

type VendorProductOption = {
  id: string;
  name: string;
};

type VendorCoupon = {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  isActive: boolean;
  appliesToAllProducts: boolean;
  productIds: string[];
  productNames: string[];
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  minOrderAmount: number | null;
  createdAt: string;
};

type CouponFormState = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  isActive: boolean;
  appliesToAllProducts: boolean;
  productIds: string[];
  expiresAt: string;
  maxUses: string;
  minOrderAmount: string;
};

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function emptyForm(): CouponFormState {
  return {
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "10",
    isActive: true,
    appliesToAllProducts: true,
    productIds: [],
    expiresAt: "",
    maxUses: "",
    minOrderAmount: "",
  };
}

function formatDiscount(coupon: VendorCoupon) {
  if (coupon.discountType === "PERCENTAGE") {
    return `${coupon.discountValue}% off`;
  }
  return `$${(coupon.discountValue / 100).toFixed(2)} off`;
}

function toPayload(form: CouponFormState) {
  return {
    code: form.code.trim().toUpperCase(),
    discountType: form.discountType,
    discountValue:
      form.discountType === "PERCENTAGE"
        ? Number.parseInt(form.discountValue, 10)
        : Math.round(Number.parseFloat(form.discountValue) * 100),
    isActive: form.isActive,
    appliesToAllProducts: form.appliesToAllProducts,
    productIds: form.appliesToAllProducts ? [] : form.productIds,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    maxUses: form.maxUses ? Number.parseInt(form.maxUses, 10) : null,
    minOrderAmount: form.minOrderAmount
      ? Math.round(Number.parseFloat(form.minOrderAmount) * 100)
      : null,
  };
}

function couponToForm(coupon: VendorCoupon): CouponFormState {
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue:
      coupon.discountType === "PERCENTAGE"
        ? String(coupon.discountValue)
        : (coupon.discountValue / 100).toFixed(2),
    isActive: coupon.isActive,
    appliesToAllProducts: coupon.appliesToAllProducts,
    productIds: coupon.productIds,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : "",
    maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
    minOrderAmount:
      coupon.minOrderAmount != null ? (coupon.minOrderAmount / 100).toFixed(2) : "",
  };
}

function formatCouponScope(coupon: VendorCoupon) {
  if (coupon.appliesToAllProducts) return "All products";
  if (coupon.productNames.length > 0) return coupon.productNames.join(", ");
  return `${coupon.productIds.length} product(s)`;
}

function CouponFormFields({
  form,
  onChange,
  vendorProducts,
}: {
  form: CouponFormState;
  onChange: (next: CouponFormState) => void;
  vendorProducts: VendorProductOption[];
}) {
  const toggleProduct = (productId: string) => {
    const next = form.productIds.includes(productId)
      ? form.productIds.filter((id) => id !== productId)
      : [...form.productIds, productId];
    onChange({ ...form, productIds: next });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm text-neutral-700 sm:col-span-2">
        Coupon code
        <input
          className={INPUT_CLASS}
          value={form.code}
          onChange={(event) => onChange({ ...form, code: event.target.value.toUpperCase() })}
          placeholder="SAVE10"
          required
        />
      </label>
      <label className="block text-sm text-neutral-700">
        Discount type
        <select
          className={INPUT_CLASS}
          value={form.discountType}
          onChange={(event) =>
            onChange({
              ...form,
              discountType: event.target.value as CouponDiscountType,
            })
          }
        >
          <option value="PERCENTAGE">Percentage (%)</option>
          <option value="FIXED_AMOUNT">Fixed amount ($)</option>
        </select>
      </label>
      <label className="block text-sm text-neutral-700">
        {form.discountType === "PERCENTAGE" ? "Discount (%)" : "Discount amount ($)"}
        <input
          className={INPUT_CLASS}
          type="number"
          min="1"
          max={form.discountType === "PERCENTAGE" ? "100" : undefined}
          step={form.discountType === "PERCENTAGE" ? "1" : "0.01"}
          value={form.discountValue}
          onChange={(event) => onChange({ ...form, discountValue: event.target.value })}
          required
        />
      </label>
      <label className="block text-sm text-neutral-700">
        Expires at (optional)
        <input
          className={INPUT_CLASS}
          type="datetime-local"
          value={form.expiresAt}
          onChange={(event) => onChange({ ...form, expiresAt: event.target.value })}
        />
      </label>
      <label className="block text-sm text-neutral-700">
        Max uses (optional)
        <input
          className={INPUT_CLASS}
          type="number"
          min="1"
          value={form.maxUses}
          onChange={(event) => onChange({ ...form, maxUses: event.target.value })}
          placeholder="Unlimited"
        />
      </label>
      <div className="sm:col-span-2 space-y-3">
        <p className="text-sm font-medium text-neutral-700">Applies to</p>
        <div className="flex flex-wrap gap-4 text-sm text-neutral-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="couponScope"
              checked={form.appliesToAllProducts}
              onChange={() => onChange({ ...form, appliesToAllProducts: true, productIds: [] })}
            />
            All products
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="couponScope"
              checked={!form.appliesToAllProducts}
              onChange={() => onChange({ ...form, appliesToAllProducts: false })}
            />
            Selected products only
          </label>
        </div>
        {!form.appliesToAllProducts ? (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 p-3">
            {vendorProducts.length === 0 ? (
              <p className="text-sm text-neutral-500">No products yet. Create a product first.</p>
            ) : (
              <ul className="space-y-2">
                {vendorProducts.map((product) => (
                  <li key={product.id}>
                    <label className="flex items-center gap-2 text-sm text-neutral-800">
                      <input
                        type="checkbox"
                        checked={form.productIds.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
                      />
                      {product.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      <label className="block text-sm text-neutral-700 sm:col-span-2">
        Minimum order for eligible products (optional, $)
        <input
          className={INPUT_CLASS}
          type="number"
          min="0"
          step="0.01"
          value={form.minOrderAmount}
          onChange={(event) => onChange({ ...form, minOrderAmount: event.target.value })}
          placeholder="No minimum"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => onChange({ ...form, isActive: event.target.checked })}
          className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
        />
        Active — customers can use this code at checkout
      </label>
    </div>
  );
}

export default function VendorCouponsPage() {
  const { isLoading: guardLoading } = useDashboardGuard("VENDOR");
  const [coupons, setCoupons] = useState<VendorCoupon[]>([]);
  const [vendorProducts, setVendorProducts] = useState<VendorProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormState>(() => emptyForm());

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth("/api/vendor/coupons");
      const data = await parseApiResponse<VendorCoupon[]>(response);
      setCoupons(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load coupons.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVendorProducts = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/vendor/products");
      const data = await parseApiResponse<{ id: string; name: string }[]>(response);
      setVendorProducts(data.map((product) => ({ id: product.id, name: product.name })));
    } catch {
      setVendorProducts([]);
    }
  }, []);

  useEffect(() => {
    if (guardLoading) return;
    void loadCoupons();
    void loadVendorProducts();
  }, [guardLoading, loadCoupons, loadVendorProducts]);

  const {
    paginatedItems: paginatedCoupons,
    pageIndex,
    pageCount,
    pageSize,
    pageSizeOptions,
    setPageIndex,
    setPageSize,
  } = useClientPagination(coupons, { initialPageSize: 10 });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (coupon: VendorCoupon) => {
    setEditingId(coupon.id);
    setForm(couponToForm(coupon));
    setShowForm(true);
  };

  const saveCoupon = async () => {
    if (!form.appliesToAllProducts && form.productIds.length === 0) {
      toast.error("Select at least one product, or choose all products.");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(form);
      const response = await fetchWithAuth(
        editingId ? `/api/vendor/coupons/${editingId}` : "/api/vendor/coupons",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const saved = await parseApiResponse<VendorCoupon>(response);
      setCoupons((current) =>
        editingId
          ? current.map((coupon) => (coupon.id === saved.id ? saved : coupon))
          : [saved, ...current]
      );
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      toast.success(editingId ? "Coupon updated" : "Coupon created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: VendorCoupon) => {
    try {
      const response = await fetchWithAuth(`/api/vendor/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const saved = await parseApiResponse<VendorCoupon>(response);
      setCoupons((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      toast.success(saved.isActive ? "Coupon activated" : "Coupon deactivated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update coupon.");
    }
  };

  if (guardLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">Coupons</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Create discount codes for your products only. Customers can apply them at checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New coupon
        </button>
      </div>

      {showForm ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingId ? "Edit coupon" : "Create coupon"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4">
            <CouponFormFields
              form={form}
              onChange={setForm}
              vendorProducts={vendorProducts}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveCoupon()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create coupon"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Tag className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-neutral-900">No coupons yet</p>
            <p className="mt-1 text-sm text-neutral-600">
              Create a code like <strong>SAVE10</strong> to offer 10% off your products.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-neutral-200">
              {paginatedCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-base font-bold text-[#0f3460]">{coupon.code}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          coupon.isActive
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                        }`}
                      >
                        {coupon.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-700">{formatDiscount(coupon)}</p>
                    <p className="mt-1 text-xs text-neutral-600">
                      {formatCouponScope(coupon)}
                      {!coupon.appliesToAllProducts
                        ? " · Shown on those product pages"
                        : " · Shown on your store and checkout"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Used {coupon.usedCount}
                      {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ""}
                      {coupon.expiresAt
                        ? ` · Expires ${new Date(coupon.expiresAt).toLocaleDateString()}`
                        : ""}
                      {coupon.minOrderAmount != null
                        ? ` · Min order $${(coupon.minOrderAmount / 100).toFixed(2)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(coupon)}
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(coupon)}
                      className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      {coupon.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <PaginationFooter
              pageIndex={pageIndex}
              pageCount={pageCount}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageIndexChange={setPageIndex}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </section>
    </div>
  );
}
