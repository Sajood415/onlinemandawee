"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ImageIcon,
  Loader2,
  Search,
  X,
  XCircle,
} from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

/* ─── Types ──────────────────────────────────────────────────────────── */

type AdminProduct = {
  id: string;
  name: string;
  description: string;
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

/* ─── Helpers ─────────────────────────────────────────────────────────── */

const STATUS_TABS: { value: ProductApprovalStatus | "ALL"; label: string }[] = [
  { value: "ALL",              label: "All" },
  { value: "PENDING_APPROVAL", label: "Pending review" },
  { value: "APPROVED",         label: "Approved" },
  { value: "REJECTED",         label: "Rejected" },
  { value: "DRAFT",            label: "Draft" },
  { value: "ARCHIVED",         label: "Archived" },
];

function badgeClass(s: ProductApprovalStatus) {
  if (s === "APPROVED")         return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "PENDING_APPROVAL") return "bg-amber-50  text-amber-700  ring-amber-200";
  if (s === "REJECTED")         return "bg-red-50    text-red-700    ring-red-200";
  if (s === "ARCHIVED")         return "bg-neutral-100 text-neutral-600 ring-neutral-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function AdminProductsPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");

  const [products, setProducts]       = useState<AdminProduct[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<ProductApprovalStatus | "ALL">("PENDING_APPROVAL");
  const [search, setSearch]           = useState("");
  const [actionId, setActionId]       = useState<string | null>(null);

  /* reject modal */
  const [rejectTarget, setRejectTarget] = useState<AdminProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting]       = useState(false);

  /* detail drawer */
  const [detailProduct, setDetailProduct] = useState<AdminProduct | null>(null);

  /* ── Fetch ──────────────────────────────────────────────────────── */

  const fetchProducts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const qs = activeTab !== "ALL" ? `?approvalStatus=${activeTab}` : "";
      const res = await fetchWithAuth(`/api/admin/products${qs}`);
      const data = await parseApiResponse<AdminProduct[]>(res);
      setProducts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!authLoading && user) void fetchProducts();
  }, [authLoading, user, fetchProducts]);

  /* auto-refresh when admin returns to this tab */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchProducts(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchProducts]);

  /* ── Approve ────────────────────────────────────────────────────── */

  const onApprove = async (product: AdminProduct) => {
    setActionId(product.id);
    try {
      const res = await fetchWithAuth(`/api/admin/products/${product.id}/approve`, {
        method: "POST",
      });
      await parseApiResponse<AdminProduct>(res);
      toast.success("Approved", `"${product.name}" is now live.`);
      if (detailProduct?.id === product.id) setDetailProduct(null);
      await fetchProducts(true);
    } catch (err) {
      toast.error("Could not approve", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setActionId(null);
    }
  };

  /* ── Reject ─────────────────────────────────────────────────────── */

  const openReject = (product: AdminProduct) => {
    setRejectTarget(product);
    setRejectReason("");
  };

  const onRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const res = await fetchWithAuth(`/api/admin/products/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      await parseApiResponse<AdminProduct>(res);
      toast.success("Rejected", `"${rejectTarget.name}" has been rejected.`);
      if (detailProduct?.id === rejectTarget.id) setDetailProduct(null);
      setRejectTarget(null);
      await fetchProducts(true);
    } catch (err) {
      toast.error("Could not reject", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRejecting(false);
    }
  };

  /* ── Guard ──────────────────────────────────────────────────────── */

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  /* ── Filtered list ──────────────────────────────────────────────── */

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.vendorProfile.storeName ?? "").toLowerCase().includes(q) ||
      p.vendorProfile.user.email.toLowerCase().includes(q)
    );
  });

  const pendingCount = products.filter((p) => p.approvalStatus === "PENDING_APPROVAL").length;

  /* ─── Render ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 pb-16">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f3460]">
            Product Approvals
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Review product listings submitted by vendors. Approve or reject with a reason.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
            {pendingCount} pending review
          </span>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.value
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products card */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Search by product name, vendor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-neutral-500">
            {loading ? "Loading…" : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-neutral-200" />
              <p className="text-sm text-neutral-500">No products in this category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-neutral-100 transition-colors hover:bg-neutral-50"
                    >
                      {/* Product */}
                      <td className="px-3 py-3">
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
                            <button
                              type="button"
                              onClick={() => setDetailProduct(product)}
                              className="max-w-[160px] truncate text-left font-medium text-primary hover:underline"
                            >
                              {product.name}
                            </button>
                            <p className="max-w-[160px] truncate text-xs text-neutral-400">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="px-3 py-3">
                        <p className="font-medium text-neutral-800">
                          {product.vendorProfile.storeName ?? product.vendorProfile.user.fullName}
                        </p>
                        <p className="text-xs text-neutral-400">{product.vendorProfile.user.email}</p>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-3 text-neutral-600">{product.category.name}</td>

                      {/* Price */}
                      <td className="px-3 py-3 tabular-nums">
                        {(product.priceAmount / 100).toLocaleString(undefined, {
                          style: "currency",
                          currency: product.currency || "USD",
                        })}
                      </td>

                      {/* Stock */}
                      <td className="px-3 py-3 tabular-nums">{product.stockQty}</td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badgeClass(product.approvalStatus)}`}>
                          {product.approvalStatus.replaceAll("_", " ")}
                        </span>
                        {product.rejectionReason && (
                          <p className="mt-1 max-w-[160px] truncate text-xs text-red-500" title={product.rejectionReason}>
                            {product.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3">
                        {product.approvalStatus === "PENDING_APPROVAL" ? (
                          <div className="flex items-center gap-2">
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
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actionId === product.id}
                              onClick={() => openReject(product)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Product detail drawer ─────────────────────────────────── */}
      {detailProduct && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setDetailProduct(null); }}
        >
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            {/* drawer header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <h3 className="text-base font-semibold text-neutral-900">Product details</h3>
              <button type="button" onClick={() => setDetailProduct(null)} className="rounded-lg p-1.5 hover:bg-neutral-100">
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            {/* drawer body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* images */}
              {detailProduct.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {detailProduct.images.map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={img} alt={detailProduct.name} className="aspect-square w-full rounded-xl object-cover" />
                  ))}
                </div>
              )}

              {/* title + status */}
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-semibold text-neutral-900">{detailProduct.name}</h4>
                <span className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badgeClass(detailProduct.approvalStatus)}`}>
                  {detailProduct.approvalStatus.replaceAll("_", " ")}
                </span>
              </div>

              {/* meta grid */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Price</dt>
                  <dd className="mt-0.5 font-medium text-neutral-900">
                    {(detailProduct.priceAmount / 100).toLocaleString(undefined, { style: "currency", currency: detailProduct.currency || "USD" })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Stock</dt>
                  <dd className="mt-0.5 font-medium text-neutral-900">{detailProduct.stockQty}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Category</dt>
                  <dd className="mt-0.5 text-neutral-700">{detailProduct.category.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">SKU</dt>
                  <dd className="mt-0.5 text-neutral-700">{detailProduct.sku ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Vendor</dt>
                  <dd className="mt-0.5 text-neutral-700">
                    {detailProduct.vendorProfile.storeName ?? detailProduct.vendorProfile.user.fullName}
                    <span className="ml-1.5 text-neutral-400">({detailProduct.vendorProfile.user.email})</span>
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Description</dt>
                  <dd className="mt-0.5 leading-relaxed text-neutral-700">{detailProduct.description}</dd>
                </div>
                {detailProduct.rejectionReason && (
                  <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-red-500">Rejection reason</dt>
                    <dd className="mt-0.5 text-sm text-red-700">{detailProduct.rejectionReason}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* drawer footer — only show actions for pending */}
            {detailProduct.approvalStatus === "PENDING_APPROVAL" && (
              <div className="flex items-center gap-3 border-t border-neutral-100 px-5 py-4">
                <button
                  type="button"
                  disabled={actionId === detailProduct.id}
                  onClick={() => void onApprove(detailProduct)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {actionId === detailProduct.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => { openReject(detailProduct); setDetailProduct(null); }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject reason modal ───────────────────────────────────── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h3 className="text-base font-semibold text-neutral-900">Reject product</h3>
              <button type="button" onClick={() => setRejectTarget(null)} className="rounded-lg p-1.5 hover:bg-neutral-100">
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-neutral-700">
                You are rejecting <span className="font-semibold">"{rejectTarget.name}"</span>. Provide an optional reason to help the vendor improve their listing.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  Reason <span className="font-normal text-neutral-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Images are low quality, description is too short…"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={() => void onRejectConfirm()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {rejecting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
