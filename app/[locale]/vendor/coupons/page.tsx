"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { usePlatformConfig } from "@/components/providers/PlatformConfigProvider";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import {
  VendorCouponFormModal,
  type CouponDiscountType,
  type CouponFormState,
  type VendorProductOption,
} from "@/components/vendor/coupons/VendorCouponFormModal";
import { VendorConfirmDialog } from "@/components/vendor/products/VendorConfirmDialog";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type CouponLifecycle = "active" | "inactive" | "scheduled" | "expired" | "exhausted";

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

const CODE_REGEX = /^[A-Za-z0-9_-]+$/;
const LIFECYCLE_FILTERS: Array<CouponLifecycle | ""> = [
  "",
  "active",
  "inactive",
  "scheduled",
  "expired",
  "exhausted",
];

function emptyForm(): CouponFormState {
  return {
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "10",
    isActive: true,
    appliesToAllProducts: true,
    productIds: [],
    startsAt: "",
    expiresAt: "",
    maxUses: "",
    minOrderAmount: "",
  };
}

function toLocalInput(iso: string | null) {
  return iso ? iso.slice(0, 16) : "";
}

function getCouponLifecycle(coupon: VendorCoupon): CouponLifecycle {
  if (!coupon.isActive) return "inactive";
  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
    return "scheduled";
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
    return "expired";
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return "exhausted";
  }
  return "active";
}

function lifecycleBadgeClass(status: CouponLifecycle) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "scheduled") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }
  if (status === "expired" || status === "exhausted") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  return "bg-neutral-100 text-neutral-600 ring-neutral-200";
}

function formatMoney(amountMinor: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
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
    startsAt: toLocalInput(coupon.startsAt),
    expiresAt: toLocalInput(coupon.expiresAt),
    maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
    minOrderAmount:
      coupon.minOrderAmount != null
        ? (coupon.minOrderAmount / 100).toFixed(2)
        : "",
  };
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
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    maxUses: form.maxUses ? Number.parseInt(form.maxUses, 10) : null,
    minOrderAmount: form.minOrderAmount
      ? Math.round(Number.parseFloat(form.minOrderAmount) * 100)
      : null,
  };
}

export default function VendorCouponsPage() {
  const t = useTranslations("VendorPages.coupons");
  const locale = useLocale();
  const { availableCurrencies } = usePlatformConfig();
  const currency = availableCurrencies[0] ?? "USD";
  const { isLoading: guardLoading } = useDashboardGuard("VENDOR");

  const [coupons, setCoupons] = useState<VendorCoupon[]>([]);
  const [vendorProducts, setVendorProducts] = useState<VendorProductOption[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormState>(() => emptyForm());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<CouponLifecycle | "">("");
  const [toggleTarget, setToggleTarget] = useState<VendorCoupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VendorCoupon | null>(null);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth("/api/vendor/coupons");
      const data = await parseApiResponse<VendorCoupon[]>(response);
      setCoupons(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadVendorProducts = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/vendor/products");
      const data = await parseApiResponse<
        {
          id: string;
          name: string;
          approvalStatus: string;
          isActive: boolean;
        }[]
      >(response);
      setVendorProducts(
        data
          .filter(
            (product) =>
              product.approvalStatus === "APPROVED" && product.isActive
          )
          .map((product) => ({ id: product.id, name: product.name }))
      );
    } catch {
      setVendorProducts([]);
    }
  }, []);

  useEffect(() => {
    if (guardLoading) return;
    void loadCoupons();
    void loadVendorProducts();
  }, [guardLoading, loadCoupons, loadVendorProducts]);

  const filteredCoupons = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return coupons.filter((coupon) => {
      const lifecycle = getCouponLifecycle(coupon);
      const matchStatus = !statusFilter || lifecycle === statusFilter;
      const matchText = !q || coupon.code.toLowerCase().includes(q);
      return matchStatus && matchText;
    });
  }, [coupons, searchText, statusFilter]);

  const {
    paginatedItems: paginatedCoupons,
    pageIndex,
    pageCount,
    pageSize,
    pageSizeOptions,
    setPageIndex,
    setPageSize,
  } = useClientPagination(filteredCoupons, { initialPageSize: 10 });

  useEffect(() => {
    setPageIndex(0);
  }, [searchText, statusFilter, setPageIndex]);

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

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const validateForm = () => {
    const code = form.code.trim().toUpperCase();
    if (code.length < 3) {
      toast.error(t("toasts.validationTitle"), t("toasts.codeShort"));
      return false;
    }
    if (code.length > 32) {
      toast.error(t("toasts.validationTitle"), t("toasts.codeLong"));
      return false;
    }
    if (!CODE_REGEX.test(code)) {
      toast.error(t("toasts.validationTitle"), t("toasts.codeInvalid"));
      return false;
    }

    const discountRaw =
      form.discountType === "PERCENTAGE"
        ? Number.parseInt(form.discountValue, 10)
        : Number.parseFloat(form.discountValue);
    if (!Number.isFinite(discountRaw) || discountRaw <= 0) {
      toast.error(t("toasts.validationTitle"), t("toasts.discountInvalid"));
      return false;
    }
    if (form.discountType === "PERCENTAGE" && discountRaw > 100) {
      toast.error(t("toasts.validationTitle"), t("toasts.percentCap"));
      return false;
    }

    if (!form.appliesToAllProducts && form.productIds.length === 0) {
      toast.error(t("toasts.validationTitle"), t("toasts.selectProducts"));
      return false;
    }

    if (form.startsAt && form.expiresAt) {
      if (new Date(form.startsAt).getTime() >= new Date(form.expiresAt).getTime()) {
        toast.error(t("toasts.validationTitle"), t("toasts.dateOrder"));
        return false;
      }
    }

    return true;
  };

  const saveCoupon = async () => {
    if (!validateForm()) return;

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
      closeForm();
      setForm(emptyForm());
      toast.success(editingId ? t("toasts.updated") : t("toasts.created"));
    } catch (error) {
      toast.error(
        t("toasts.saveError"),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    const coupon = toggleTarget;
    try {
      const response = await fetchWithAuth(`/api/vendor/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const saved = await parseApiResponse<VendorCoupon>(response);
      setCoupons((current) =>
        current.map((item) => (item.id === saved.id ? saved : item))
      );
      toast.success(
        saved.isActive ? t("toasts.activated") : t("toasts.deactivated")
      );
      setToggleTarget(null);
    } catch (error) {
      toast.error(
        t("toasts.updateError"),
        error instanceof Error ? error.message : undefined
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetchWithAuth(
        `/api/vendor/coupons/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      await parseApiResponse<{ id: string }>(response);
      setCoupons((current) =>
        current.filter((item) => item.id !== deleteTarget.id)
      );
      if (editingId === deleteTarget.id) closeForm();
      toast.success(t("toasts.deleted"));
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        t("toasts.deleteError"),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setDeleting(false);
    }
  };

  const formatDiscount = (coupon: VendorCoupon) => {
    if (coupon.discountType === "PERCENTAGE") {
      return `${coupon.discountValue}%`;
    }
    return formatMoney(coupon.discountValue, currency, locale);
  };

  const formatScope = (coupon: VendorCoupon) => {
    if (coupon.appliesToAllProducts) return t("scopeAll");
    if (coupon.productNames.length > 0) return coupon.productNames.join(", ");
    return t("scopeSelected", { count: coupon.productIds.length });
  };

  if (guardLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">{t("subtitle")}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {t("hint", { currency })}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {t("newCoupon")}
        </button>
      </div>

      <VendorCouponFormModal
        open={showForm}
        isEdit={Boolean(editingId)}
        form={form}
        currency={currency}
        saving={saving}
        vendorProducts={vendorProducts}
        onClose={closeForm}
        onChange={setForm}
        onSave={() => void saveCoupon()}
      />

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-neutral-100 px-4 py-4 sm:px-5">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 rtl:left-auto rtl:right-3" />
            <input
              className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 rtl:pl-3 rtl:pr-9"
              placeholder={t("searchPlaceholder")}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <select
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as CouponLifecycle | "")
            }
          >
            {LIFECYCLE_FILTERS.map((value) => (
              <option key={value || "all"} value={value}>
                {value ? t(`statuses.${value}`) : t("allStatuses")}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-neutral-600">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            {t("loading")}
          </div>
        ) : coupons.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Tag className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-neutral-900">{t("empty")}</p>
            <p className="mt-1 text-sm text-neutral-600">{t("emptyHint")}</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t("addFirst")}
            </button>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-neutral-600">
            {t("emptyFiltered")}
          </div>
        ) : (
          <>
            <div className="divide-y divide-neutral-200">
              {paginatedCoupons.map((coupon) => {
                const lifecycle = getCouponLifecycle(coupon);
                return (
                  <div
                    key={coupon.id}
                    className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-base font-bold text-primary">
                          {coupon.code}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${lifecycleBadgeClass(lifecycle)}`}
                        >
                          {t(`statuses.${lifecycle}`)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-neutral-800">
                        {t("discountOff", { value: formatDiscount(coupon) })}
                      </p>
                      <p className="mt-1 text-xs text-neutral-600">
                        {formatScope(coupon)}
                        {" · "}
                        {coupon.appliesToAllProducts
                          ? t("scopeShownAll")
                          : t("scopeShownSelected")}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {coupon.maxUses != null
                          ? t("usedOf", {
                              count: coupon.usedCount,
                              max: coupon.maxUses,
                            })
                          : t("used", { count: coupon.usedCount })}
                        {coupon.startsAt
                          ? ` · ${t("starts", {
                              date: new Date(coupon.startsAt).toLocaleString(locale),
                            })}`
                          : ""}
                        {coupon.expiresAt
                          ? ` · ${t("expires", {
                              date: new Date(coupon.expiresAt).toLocaleString(locale),
                            })}`
                          : ""}
                        {coupon.minOrderAmount != null
                          ? ` · ${t("minOrder", {
                              amount: formatMoney(
                                coupon.minOrderAmount,
                                currency,
                                locale
                              ),
                            })}`
                          : ""}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => openEdit(coupon)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                      >
                        <Pencil className="h-4 w-4" />
                        {t("edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setToggleTarget(coupon)}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                      >
                        {coupon.isActive ? t("deactivate") : t("activate")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(coupon)}
                        className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 sm:col-span-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
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

      <VendorConfirmDialog
        open={Boolean(toggleTarget)}
        title={
          toggleTarget?.isActive
            ? t("deactivateConfirm.title")
            : t("activateConfirm.title")
        }
        body={
          toggleTarget?.isActive
            ? t("deactivateConfirm.body")
            : t("activateConfirm.body")
        }
        confirmLabel={
          toggleTarget?.isActive
            ? t("deactivateConfirm.confirm")
            : t("activateConfirm.confirm")
        }
        cancelLabel={
          toggleTarget?.isActive
            ? t("deactivateConfirm.cancel")
            : t("activateConfirm.cancel")
        }
        danger={Boolean(toggleTarget?.isActive)}
        onConfirm={() => void confirmToggle()}
        onCancel={() => setToggleTarget(null)}
      />

      <VendorConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("deleteConfirm.title")}
        body={t("deleteConfirm.body")}
        confirmLabel={t("deleteConfirm.confirm")}
        cancelLabel={t("deleteConfirm.cancel")}
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
