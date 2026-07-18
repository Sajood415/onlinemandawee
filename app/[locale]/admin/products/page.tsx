"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { AdminProductEditPanel } from "@/components/admin/AdminProductEditPanel";
import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import type { ProductTranslations } from "@/lib/localization/product-content";
import { toast } from "@/lib/utils/toast";

type ProductVariant = {
  id: string;
  name: string;
  priceAmount: number | null;
  stockQty: number;
  sku: string | null;
  isActive: boolean;
};

type AdminProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  translations?: ProductTranslations | null;
  images: string[];
  sku: string | null;
  currency: string;
  priceAmount: number;
  stockQty: number;
  approvalStatus: ProductApprovalStatus;
  rejectionReason: string | null;
  isActive: boolean;
  createdAt: string;
  category: { id: string; name: string };
  vendorProfile: {
    id: string;
    storeName: string | null;
    user: { fullName: string; email: string };
  };
};

type SavedAdminProduct = Omit<AdminProduct, "vendorProfile" | "createdAt"> & {
  vendorProfile?: AdminProduct["vendorProfile"];
  createdAt?: string;
};

type VendorOption = {
  id: string;
  storeName: string | null;
  user: { fullName: string; email: string };
};

const STATUS_TABS: Array<ProductApprovalStatus | "ALL"> = [
  "ALL",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "DRAFT",
  "ARCHIVED",
];

function badgeClass(s: ProductApprovalStatus) {
  if (s === "APPROVED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (s === "REJECTED") return "bg-red-50 text-red-700 ring-red-200";
  if (s === "ARCHIVED") return "bg-neutral-100 text-neutral-600 ring-neutral-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

export default function AdminProductsPage() {
  const t = useTranslations("AdminPages.products");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProductApprovalStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [pendingCount, setPendingCount] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<AdminProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [detailProduct, setDetailProduct] = useState<AdminProduct | null>(null);
  const [drawerEditing, setDrawerEditing] = useState(false);
  const [drawerVariants, setDrawerVariants] = useState<ProductVariant[]>([]);
  const [drawerVariantsLoading, setDrawerVariantsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (activeTab !== "ALL") params.set("approvalStatus", activeTab);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (vendorFilter) params.set("vendorProfileId", vendorFilter);
    if (activeFilter) params.set("isActive", activeFilter);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [activeTab, debouncedSearch, vendorFilter, activeFilter]);

  const fetchProducts = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(`/api/admin/products${buildQuery()}`);
        const data = await parseApiResponse<AdminProduct[]>(res);
        setProducts(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("loadError"));
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, t]
  );

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetchWithAuth(
        "/api/admin/products?approvalStatus=PENDING_APPROVAL"
      );
      const data = await parseApiResponse<AdminProduct[]>(res);
      setPendingCount(data.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      void fetchProducts();
      void fetchPendingCount();
      fetchWithAuth("/api/admin/vendors")
        .then((res) => parseApiResponse<VendorOption[]>(res))
        .then(setVendors)
        .catch(() => setVendors([]));
    }
  }, [authLoading, user, fetchProducts, fetchPendingCount]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchProducts(true);
        void fetchPendingCount();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchProducts, fetchPendingCount]);

  useEffect(() => {
    if (!detailProduct || drawerEditing) {
      if (!detailProduct) setDrawerVariants([]);
      return;
    }
    setDrawerVariantsLoading(true);
    fetchWithAuth(`/api/admin/products/${detailProduct.id}/variants`)
      .then((r) => parseApiResponse<ProductVariant[]>(r))
      .then((data) => setDrawerVariants(data))
      .catch(() => setDrawerVariants([]))
      .finally(() => setDrawerVariantsLoading(false));
  }, [detailProduct, drawerEditing]);

  const closeDrawer = () => {
    setDetailProduct(null);
    setDrawerEditing(false);
  };

  const openDetail = (product: AdminProduct) => {
    setDrawerEditing(false);
    setDetailProduct(product);
  };

  const onProductSaved = async (saved: SavedAdminProduct) => {
    if (!detailProduct) return;
    const merged: AdminProduct = {
      ...detailProduct,
      ...saved,
      vendorProfile: saved.vendorProfile ?? detailProduct.vendorProfile,
      category: saved.category ?? detailProduct.category,
    };
    setDetailProduct(merged);
    setDrawerEditing(false);
    await fetchProducts(true);
    await fetchPendingCount();
  };

  const formatMoney = useCallback(
    (amount: number, currency: string) =>
      (amount / 100).toLocaleString(locale, {
        style: "currency",
        currency: currency || "USD",
      }),
    [locale]
  );

  const onApprove = async (product: AdminProduct) => {
    setActionId(product.id);
    try {
      const res = await fetchWithAuth(`/api/admin/products/${product.id}/approve`, {
        method: "POST",
      });
      await parseApiResponse<AdminProduct>(res);
      toast.success(
        t("toasts.approvedTitle"),
        t("toasts.approvedBody", { name: product.name })
      );
      if (detailProduct?.id === product.id) closeDrawer();
      await fetchProducts(true);
      await fetchPendingCount();
    } catch (err) {
      toast.error(
        t("toasts.approveFailed"),
        err instanceof Error ? err.message : t("toasts.genericError")
      );
    } finally {
      setActionId(null);
    }
  };

  const openReject = (product: AdminProduct) => {
    setRejectTarget(product);
    setRejectReason("");
  };

  const onRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const res = await fetchWithAuth(
        `/api/admin/products/${rejectTarget.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
        }
      );
      await parseApiResponse<AdminProduct>(res);
      toast.success(
        t("toasts.rejectedTitle"),
        t("toasts.rejectedBody", { name: rejectTarget.name })
      );
      if (detailProduct?.id === rejectTarget.id) closeDrawer();
      setRejectTarget(null);
      await fetchProducts(true);
      await fetchPendingCount();
    } catch (err) {
      toast.error(
        t("toasts.rejectFailed"),
        err instanceof Error ? err.message : t("toasts.genericError")
      );
    } finally {
      setRejecting(false);
    }
  };

  const columns = useMemo<ColumnDef<AdminProduct>[]>(
    () => [
      {
        header: t("columns.product"),
        accessorKey: "name",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-center gap-3">
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                  <ImageIcon className="h-5 w-5 text-neutral-300" />
                </div>
              )}
              <div>
                <p className="max-w-[160px] truncate font-medium text-neutral-900">
                  {product.name}
                </p>
                <p className="max-w-[160px] truncate text-xs text-neutral-400">
                  {product.description}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        header: t("columns.vendor"),
        id: "vendor",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-800">
              {row.original.vendorProfile.storeName ??
                row.original.vendorProfile.user.fullName}
            </p>
            <p className="text-xs text-neutral-400">
              {row.original.vendorProfile.user.email}
            </p>
          </div>
        ),
      },
      {
        header: t("columns.category"),
        accessorKey: "category.name",
        cell: ({ row }) => row.original.category.name,
      },
      {
        header: t("columns.price"),
        id: "price",
        cell: ({ row }) =>
          formatMoney(row.original.priceAmount, row.original.currency),
      },
      {
        header: t("columns.stock"),
        accessorKey: "stockQty",
      },
      {
        header: t("columns.visibility"),
        id: "visibility",
        cell: ({ row }) =>
          row.original.isActive
            ? t("visibility.active")
            : t("visibility.inactive"),
      },
      {
        header: t("columns.status"),
        id: "status",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badgeClass(product.approvalStatus)}`}
              >
                {t(`statuses.${product.approvalStatus}`)}
              </span>
              {product.rejectionReason ? (
                <p
                  className="mt-1 max-w-[160px] truncate text-xs text-red-500"
                  title={product.rejectionReason}
                >
                  {product.rejectionReason}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        header: t("columns.actions"),
        id: "actions",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div
              className="flex items-center gap-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {product.approvalStatus === "PENDING_APPROVAL" ? (
                <>
                  <button
                    type="button"
                    disabled={actionId === product.id}
                    onClick={() => void onApprove(product)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    {actionId === product.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {t("actions.approve")}
                  </button>
                  <button
                    type="button"
                    disabled={actionId === product.id}
                    onClick={() => openReject(product)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {t("actions.reject")}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setDrawerEditing(true);
                  setDetailProduct(product);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("actions.edit")}
              </button>
            </div>
          );
        },
      },
    ],
    [actionId, formatMoney, t]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-neutral-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
              {t("pendingCount", { count: pendingCount })}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void fetchProducts();
              void fetchPendingCount();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pe-3 ps-9 text-sm outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
        >
          <option value="">{t("allVendors")}</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.storeName ?? v.user.fullName}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
          value={activeFilter}
          onChange={(e) =>
            setActiveFilter(e.target.value as "" | "true" | "false")
          }
        >
          <option value="">{t("anyVisibility")}</option>
          <option value="true">{t("activeOnly")}</option>
          <option value="false">{t("inactiveOnly")}</option>
        </select>
        <p className="text-sm text-neutral-500">
          {loading
            ? t("loadingList")
            : t("count", { count: products.length })}
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-14 text-center text-sm text-neutral-500">
          {t("loadingList")}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <DataTable
          data={products}
          columns={columns}
          getRowId={(row) => row.id}
          onRowClick={openDetail}
          emptyMessage={t("empty")}
          initialPageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      )}

      {detailProduct ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDrawer();
          }}
        >
          <div
            className={`flex h-full w-full flex-col bg-white shadow-2xl ${
              drawerEditing ? "max-w-xl" : "max-w-md"
            }`}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <h3 className="text-base font-semibold text-neutral-900">
                {drawerEditing
                  ? t("drawer.editTitle")
                  : t("drawer.detailsTitle")}
              </h3>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg p-1.5 hover:bg-neutral-100"
                aria-label={t("drawer.close")}
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {drawerEditing ? (
                <AdminProductEditPanel
                  product={detailProduct}
                  onSaved={onProductSaved}
                  onCancel={() => setDrawerEditing(false)}
                />
              ) : (
                <div className="space-y-5">
                  {detailProduct.images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {detailProduct.images.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={img}
                          alt={detailProduct.name}
                          className="aspect-square w-full rounded-xl object-cover"
                        />
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-lg font-semibold text-neutral-900">
                      {detailProduct.name}
                    </h4>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badgeClass(detailProduct.approvalStatus)}`}
                    >
                      {t(`statuses.${detailProduct.approvalStatus}`)}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-medium text-neutral-500">
                        {t("columns.price")}
                      </dt>
                      <dd className="mt-0.5 font-medium text-neutral-900">
                        {formatMoney(
                          detailProduct.priceAmount,
                          detailProduct.currency
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-neutral-500">
                        {t("columns.stock")}
                      </dt>
                      <dd className="mt-0.5 font-medium text-neutral-900">
                        {detailProduct.stockQty}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-neutral-500">
                        {t("columns.category")}
                      </dt>
                      <dd className="mt-0.5 text-neutral-700">
                        {detailProduct.category.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-neutral-500">
                        {t("drawer.sku")}
                      </dt>
                      <dd className="mt-0.5 text-neutral-700">
                        {detailProduct.sku ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-neutral-500">
                        {t("columns.visibility")}
                      </dt>
                      <dd className="mt-0.5 text-neutral-700">
                        {detailProduct.isActive
                          ? t("visibility.active")
                          : t("visibility.inactive")}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-medium text-neutral-500">
                        {t("columns.vendor")}
                      </dt>
                      <dd className="mt-0.5 text-neutral-700">
                        {detailProduct.vendorProfile.storeName ??
                          detailProduct.vendorProfile.user.fullName}
                        <span className="ms-1.5 text-neutral-400">
                          ({detailProduct.vendorProfile.user.email})
                        </span>
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-medium text-neutral-500">
                        {t("drawer.description")}
                      </dt>
                      <dd className="mt-0.5 leading-relaxed text-neutral-700">
                        {detailProduct.description}
                      </dd>
                    </div>
                    {detailProduct.rejectionReason ? (
                      <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 p-3">
                        <dt className="text-xs font-medium text-red-500">
                          {t("drawer.rejectionReason")}
                        </dt>
                        <dd className="mt-0.5 text-sm text-red-700">
                          {detailProduct.rejectionReason}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <div>
                    <h5 className="mb-2 text-xs font-medium text-neutral-500">
                      {t("drawer.variants")}
                      {drawerVariants.length > 0
                        ? ` (${drawerVariants.length})`
                        : ""}
                    </h5>
                    {drawerVariantsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("drawer.loadingVariants")}
                      </div>
                    ) : drawerVariants.length === 0 ? (
                      <p className="text-sm text-neutral-400">
                        {t("drawer.noVariants")}
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-neutral-200">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold text-neutral-500">
                              <th className="px-3 py-2 text-start">
                                {t("drawer.variant")}
                              </th>
                              <th className="px-3 py-2 text-end">
                                {t("columns.price")}
                              </th>
                              <th className="px-3 py-2 text-end">
                                {t("columns.stock")}
                              </th>
                              <th className="px-3 py-2 text-start">
                                {t("drawer.sku")}
                              </th>
                              <th className="px-3 py-2 text-start">
                                {t("drawer.active")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {drawerVariants.map((v) => (
                              <tr
                                key={v.id}
                                className="border-b border-neutral-100 last:border-0"
                              >
                                <td className="px-3 py-2 font-medium text-neutral-800">
                                  {v.name}
                                </td>
                                <td className="px-3 py-2 text-end tabular-nums text-neutral-600">
                                  {v.priceAmount != null ? (
                                    formatMoney(
                                      v.priceAmount,
                                      detailProduct.currency
                                    )
                                  ) : (
                                    <span className="text-neutral-400">
                                      {t("drawer.basePrice")}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-end tabular-nums">
                                  {v.stockQty}
                                </td>
                                <td className="px-3 py-2 text-neutral-500">
                                  {v.sku ?? "—"}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      v.isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-neutral-100 text-neutral-500"
                                    }`}
                                  >
                                    {v.isActive
                                      ? t("drawer.yes")
                                      : t("drawer.no")}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!drawerEditing ? (
              <div className="flex items-center gap-3 border-t border-neutral-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setDrawerEditing(true)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <Pencil className="h-4 w-4" />
                  {t("drawer.editProduct")}
                </button>
                {detailProduct.approvalStatus === "PENDING_APPROVAL" ? (
                  <>
                    <button
                      type="button"
                      disabled={actionId === detailProduct.id}
                      onClick={() => void onApprove(detailProduct)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {actionId === detailProduct.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {t("actions.approve")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openReject(detailProduct)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      {t("actions.reject")}
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {rejectTarget ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h3 className="text-base font-semibold text-neutral-900">
                {t("reject.title")}
              </h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-lg p-1.5 hover:bg-neutral-100"
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-neutral-700">
                {t("reject.body", { name: rejectTarget.name })}
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  {t("reject.reason")}{" "}
                  <span className="font-normal text-neutral-400">
                    {t("reject.optional")}
                  </span>
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("reject.placeholder")}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {t("reject.cancel")}
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={() => void onRejectConfirm()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {rejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {rejecting ? t("reject.submitting") : t("reject.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
