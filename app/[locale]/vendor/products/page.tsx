"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Pencil, Plus, Search, SendHorizonal, Trash2, X } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

/* ─── Types ──────────────────────────────────────────────────────────── */

type Category = { id: string; name: string; slug: string; isActive: boolean };

type VendorProduct = {
  id: string;
  categoryId: string;
  category: { id: string; name: string };
  name: string;
  slug: string;
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
};

type ImageSlot =
  | { kind: "url"; url: string }
  | { kind: "file"; file: File; preview: string; uploading: boolean };

type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  priceAmount: number | null;
  stockQty: number;
  sku: string | null;
  isActive: boolean;
};

type VariantFormRow = {
  localId: string;
  id?: string; // set for existing variants (edit mode)
  name: string;
  priceAmount: string;
  stockQty: string;
  sku: string;
  isActive: boolean;
};

type ProductFormState = {
  categoryId: string;
  name: string;
  description: string;
  images: ImageSlot[];
  sku: string;
  currency: string;
  priceAmount: string;
  stockQty: string;
};

/* ─── Constants / helpers ─────────────────────────────────────────────── */

const CURRENCIES = ["AFN", "USD", "AED", "SAR", "PKR", "GBP", "EUR"] as const;

const ALL_STATUSES: ProductApprovalStatus[] = [
  "DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "ARCHIVED",
];

function emptyForm(defaultCategoryId = ""): ProductFormState {
  return {
    categoryId: defaultCategoryId,
    name: "",
    description: "",
    images: [],
    sku: "",
    currency: "USD",
    priceAmount: "",
    stockQty: "",
  };
}

function toFormState(p: VendorProduct): ProductFormState {
  return {
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    images: p.images.map((url) => ({ kind: "url", url })),
    sku: p.sku ?? "",
    currency: p.currency,
    priceAmount: String(p.priceAmount / 100),
    stockQty: String(p.stockQty),
  };
}

function approvalBadgeClass(s: ProductApprovalStatus) {
  if (s === "APPROVED")        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (s === "REJECTED")        return "bg-red-50 text-red-700 ring-red-200";
  if (s === "ARCHIVED")        return "bg-neutral-100 text-neutral-600 ring-neutral-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

const INPUT =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const LABEL = "block text-sm font-medium text-neutral-700";

let rowCounter = 0;
function newVariantRow(): VariantFormRow {
  return {
    localId: `new-${++rowCounter}`,
    name: "",
    priceAmount: "",
    stockQty: "0",
    sku: "",
    isActive: true,
  };
}

function variantToRow(v: ProductVariant): VariantFormRow {
  return {
    localId: v.id,
    id: v.id,
    name: v.name,
    priceAmount: v.priceAmount != null ? String(v.priceAmount / 100) : "",
    stockQty: String(v.stockQty),
    sku: v.sku ?? "",
    isActive: v.isActive,
  };
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function VendorProductsPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("VENDOR");

  /* data */
  const [products, setProducts]   = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  /* modal */
  const [modalOpen, setModalOpen]           = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm]                     = useState<ProductFormState>(emptyForm());
  const [saving, setSaving]                 = useState(false);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  /* delete */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* submit for approval */
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = useState(false);

  /* variants */
  const [variantRows, setVariantRows]             = useState<VariantFormRow[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  const [variantsLoading, setVariantsLoading]     = useState(false);
  const [variantsError, setVariantsError]         = useState<string | null>(null);

  /* filters */
  const [searchText, setSearchText]       = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus]   = useState<ProductApprovalStatus | "">("");

  const isEdit = Boolean(editingProductId);

  /* ── Fetch ──────────────────────────────────────────────────────── */

  const fetchData = useCallback(async (silent = false) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [pr, cr] = await Promise.all([
        fetch("/api/vendor/products", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/catalog/categories"),
      ]);
      const [pd, cd] = await Promise.all([
        parseApiResponse<VendorProduct[]>(pr),
        parseApiResponse<Category[]>(cr),
      ]);
      setProducts(pd);
      setCategories(cd.filter((c) => c.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void fetchData();
  }, [authLoading, user, fetchData]);

  /* auto-refresh when tab regains focus so admin status changes are reflected */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchData(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData]);

  /* ── Modal open/close ───────────────────────────────────────────── */

  const openCreate = () => {
    setEditingProductId(null);
    setForm(emptyForm(categories[0]?.id ?? ""));
    setVariantRows([]);
    setDeletedVariantIds([]);
    setVariantsError(null);
    setModalOpen(true);
  };

  const openEdit = (product: VendorProduct) => {
    setEditingProductId(product.id);
    setForm(toFormState(product));
    setVariantRows([]);
    setDeletedVariantIds([]);
    setVariantsError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProductId(null);
    setVariantRows([]);
    setDeletedVariantIds([]);
    setVariantsError(null);
  };

  /* ── Form helpers ───────────────────────────────────────────────── */

  const updateField = <K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const addImageSlot = () =>
    updateField("images", [...form.images, { kind: "url", url: "" }]);

  const removeImageSlot = (i: number) => {
    const removed = form.images[i];
    if (removed.kind === "file") URL.revokeObjectURL(removed.preview);
    updateField("images", form.images.filter((_, idx) => idx !== i));
  };

  const updateUrlSlot = (i: number, url: string) =>
    setForm((prev) => {
      const next = [...prev.images];
      next[i] = { kind: "url", url };
      return { ...prev, images: next };
    });

  const handleFilePick = (files: FileList | null) => {
    if (!files) return;
    const slots: ImageSlot[] = Array.from(files).map((file) => ({
      kind: "file",
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }));
    updateField("images", [...form.images, ...slots]);
  };

  /* ── Upload single file slot ────────────────────────────────────── */

  const uploadFileSlot = async (
    slot: Extract<ImageSlot, { kind: "file" }>,
    index: number,
    token: string
  ): Promise<string> => {
    setForm((prev) => {
      const next = [...prev.images];
      next[index] = { ...slot, uploading: true };
      return { ...prev, images: next };
    });
    const fd = new FormData();
    fd.set("file", slot.file);
    const res  = await fetch("/api/vendor/products/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await parseApiResponse<{ url: string }>(res);
    setForm((prev) => {
      const next = [...prev.images];
      URL.revokeObjectURL(slot.preview);
      next[index] = { kind: "url", url: data.url };
      return { ...prev, images: next };
    });
    return data.url;
  };

  /* ── Submit ─────────────────────────────────────────────────────── */

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (!form.categoryId) { toast.error("Category required", "Select a category."); return; }
    if (form.name.trim().length < 2) { toast.error("Name too short", "At least 2 characters."); return; }
    if (form.description.trim().length < 10) { toast.error("Description too short", "At least 10 characters."); return; }

    const priceRaw = Number(form.priceAmount);
    if (!Number.isFinite(priceRaw) || priceRaw <= 0) { toast.error("Invalid price", "Enter a price > 0."); return; }
    const priceAmount = Math.round(priceRaw * 100);

    const stockQty = Number(form.stockQty);
    if (!Number.isInteger(stockQty) || stockQty < 0) { toast.error("Invalid stock", "Must be 0 or more."); return; }

    setSaving(true);
    try {
      const resolvedUrls: string[] = [];
      for (let i = 0; i < form.images.length; i++) {
        const slot = form.images[i];
        if (slot.kind === "file") {
          resolvedUrls.push(await uploadFileSlot(slot, i, token));
        } else if (slot.url.trim()) {
          resolvedUrls.push(slot.url.trim());
        }
      }
      if (!resolvedUrls.length) { toast.error("Images required", "Add at least one image."); setSaving(false); return; }

      const payload: Record<string, unknown> = {
        categoryId: form.categoryId,
        name: form.name.trim(),
        description: form.description.trim(),
        images: resolvedUrls,
        currency: form.currency.trim().toUpperCase() || "USD",
        priceAmount,
        stockQty,
      };
      if (form.sku.trim()) payload.sku = form.sku.trim();

      const res = await fetch(
        isEdit ? `/api/vendor/products/${editingProductId}` : "/api/vendor/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );
      const savedProduct = await parseApiResponse<VendorProduct>(res);
      const productId = savedProduct.id;

      /* ── Save variants ── */
      const jsonHeaders = { "Content-Type": "application/json" };
      let variantSaveErrors = 0;

      for (const variantId of deletedVariantIds) {
        try {
          const delRes = await fetchWithAuth(
            `/api/vendor/products/${productId}/variants/${variantId}`,
            { method: "DELETE" }
          );
          await parseApiResponse<null>(delRes);
        } catch {
          variantSaveErrors++;
        }
      }

      for (const row of variantRows) {
        if (!row.name.trim()) continue;
        const priceRaw = row.priceAmount.trim() ? Number(row.priceAmount) : null;
        const variantPayload = {
          name: row.name.trim(),
          priceAmount: priceRaw != null && priceRaw > 0 ? Math.round(priceRaw * 100) : null,
          stockQty: Math.max(0, Number(row.stockQty) || 0),
          sku: row.sku.trim() || null,
          isActive: row.isActive,
        };
        try {
          const variantRes = row.id
            ? await fetchWithAuth(
                `/api/vendor/products/${productId}/variants/${row.id}`,
                { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(variantPayload) }
              )
            : await fetchWithAuth(
                `/api/vendor/products/${productId}/variants`,
                { method: "POST", headers: jsonHeaders, body: JSON.stringify(variantPayload) }
              );
          await parseApiResponse<ProductVariant>(variantRes);
        } catch {
          variantSaveErrors++;
        }
      }

      if (variantSaveErrors > 0) {
        toast.error(
          "Variants partially saved",
          `${variantSaveErrors} variant change(s) failed. Re-open the product and try again.`
        );
      }

      toast.success(
        isEdit ? "Product updated" : "Product created",
        isEdit ? "Changes saved." : "Your listing is now under review."
      );
      closeModal();
      await fetchData(true);
    } catch (err) {
      toast.error("Could not save", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Submit for approval ────────────────────────────────────────── */

  const onSubmitForApproval = async (productId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setSubmittingId(productId);
    try {
      const res = await fetch(`/api/vendor/products/${productId}/submit-for-approval`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await parseApiResponse<VendorProduct>(res);
      toast.success("Submitted", "Your product has been sent for admin review.");
      await fetchData(true);
    } catch (err) {
      toast.error("Could not submit", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmittingId(null);
    }
  };

  /* ── Submit ALL DRAFT products ─────────────────────────────────── */

  const onSubmitAll = async () => {
    const drafts = products.filter((p) => p.approvalStatus === "DRAFT");
    if (drafts.length === 0) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setSubmittingAll(true);
    let successCount = 0;
    for (const p of drafts) {
      try {
        const res = await fetch(`/api/vendor/products/${p.id}/submit-for-approval`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        await parseApiResponse<VendorProduct>(res);
        successCount++;
      } catch {
        // continue with remaining
      }
    }
    if (successCount > 0) {
      toast.success(
        "Submitted for review",
        `${successCount} product${successCount !== 1 ? "s" : ""} sent to admin for approval.`
      );
      await fetchData(true);
    }
    setSubmittingAll(false);
  };

  /* ── Variants ───────────────────────────────────────────────────── */

  const loadVariants = useCallback(async (productId: string) => {
    setVariantsLoading(true);
    setVariantsError(null);
    try {
      const res = await fetchWithAuth(`/api/vendor/products/${productId}/variants`);
      const data = await parseApiResponse<ProductVariant[]>(res);
      setVariantRows(data.map(variantToRow));
    } catch (e) {
      setVariantsError(e instanceof Error ? e.message : "Failed to load variants.");
    } finally {
      setVariantsLoading(false);
    }
  }, []);

  // load variants when modal opens for an existing product
  useEffect(() => {
    if (modalOpen && editingProductId) {
      void loadVariants(editingProductId);
    }
  }, [modalOpen, editingProductId, loadVariants]);

  const updateRow = (localId: string, patch: Partial<VariantFormRow>) =>
    setVariantRows((rows) =>
      rows.map((r) => (r.localId === localId ? { ...r, ...patch } : r))
    );

  const removeVariantRow = (row: VariantFormRow) => {
    if (row.id) setDeletedVariantIds((ids) => [...ids, row.id!]);
    setVariantRows((rows) => rows.filter((r) => r.localId !== row.localId));
  };

  /* ── Delete ─────────────────────────────────────────────────────── */

  const onDelete = async (productId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    if (!window.confirm("Delete this product listing? This cannot be undone.")) return;
    setDeletingId(productId);
    try {
      const res = await fetch(`/api/vendor/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await parseApiResponse<VendorProduct>(res);
      toast.success("Deleted", "Listing removed.");
      await fetchData(true);
    } catch (err) {
      toast.error("Could not delete", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Auth guard ─────────────────────────────────────────────────── */

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  /* ── Filtered products ──────────────────────────────────────────── */

  const filtered = products.filter((p) => {
    const matchText =
      !searchText ||
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(searchText.toLowerCase());
    const matchCat = !filterCategory || p.categoryId === filterCategory;
    const matchStatus = !filterStatus || p.approvalStatus === filterStatus;
    return matchText && matchCat && matchStatus;
  });

  /* ─── Render ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 pb-16">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f3460]">
          Product Management
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Create, edit, and delete product listings. New listings start as drafts and
          require admin approval before going live.
        </p>
      </div>

      {/* ── Listings card ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">

          {/* search */}
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Search by name or SKU…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* category filter */}
          <select
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* status filter */}
          <select
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ProductApprovalStatus | "")}
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
            ))}
          </select>

          {/* spacer */}
          <div className="flex-1" />

          {/* Submit all drafts */}
          {products.some((p) => p.approvalStatus === "DRAFT") && (
            <button
              type="button"
              disabled={submittingAll}
              onClick={() => void onSubmitAll()}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
            >
              {submittingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
              Submit all for review
            </button>
          )}

          {/* Add product button */}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>

        {/* table body */}
        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
                <ImageIcon className="h-7 w-7 text-neutral-300" />
              </div>
              <p className="text-sm font-medium text-neutral-700">
                {products.length === 0 ? "No products yet" : "No products match your filters"}
              </p>
              {products.length === 0 && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                >
                  <Plus className="h-4 w-4" />
                  Add your first product
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Images</th>
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
                            <p className="max-w-[180px] truncate font-medium text-neutral-900">
                              {product.name}
                            </p>
                            <p className="max-w-[180px] truncate text-xs text-neutral-400">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{product.category?.name ?? "—"}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {(product.priceAmount / 100).toLocaleString(undefined, {
                          style: "currency",
                          currency: product.currency || "USD",
                        })}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{product.stockQty}</td>
                      <td className="px-3 py-3">{product.images.length}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${approvalBadgeClass(product.approvalStatus)}`}
                        >
                          {product.approvalStatus === "PENDING_APPROVAL"
                            ? "Under review"
                            : product.approvalStatus.replaceAll("_", " ")}
                        </span>
                        {product.approvalStatus === "REJECTED" && product.rejectionReason && (
                          <p className="mt-1 max-w-[160px] truncate text-xs text-red-500" title={product.rejectionReason}>
                            {product.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Submit for approval — only for DRAFT or REJECTED */}
                          {(product.approvalStatus === "DRAFT" || product.approvalStatus === "REJECTED") && (
                            <button
                              type="button"
                              disabled={submittingId === product.id}
                              onClick={() => void onSubmitForApproval(product.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                            >
                              {submittingId === product.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <SendHorizonal className="h-3.5 w-3.5" />
                              )}
                              Submit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDelete(product.id)}
                            disabled={deletingId === product.id}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingId === product.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ───────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">

            {/* modal header */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h2 className="text-base font-semibold text-neutral-900">
                {isEdit ? "Edit product" : "Add new product"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* scrollable form body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form id="product-form" onSubmit={(e) => void onSubmit(e)} className="space-y-5">

                {/* Name + Category */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>Product name <span className="text-red-500">*</span></label>
                    <input
                      className={INPUT}
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      maxLength={160}
                      placeholder="e.g. Premium Saffron Honey"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>Category <span className="text-red-500">*</span></label>
                    <select
                      className={INPUT}
                      value={form.categoryId}
                      onChange={(e) => updateField("categoryId", e.target.value)}
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price row */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>Currency <span className="text-red-500">*</span></label>
                    <select className={INPUT} value={form.currency} onChange={(e) => updateField("currency", e.target.value)}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>Price <span className="text-red-500">*</span></label>
                    <input type="number" min="0.01" step="0.01" className={INPUT} value={form.priceAmount} onChange={(e) => updateField("priceAmount", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>Stock qty <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="1" className={INPUT} value={form.stockQty} onChange={(e) => updateField("stockQty", e.target.value)} placeholder="0" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>SKU (optional)</label>
                    <input className={INPUT} value={form.sku} onChange={(e) => updateField("sku", e.target.value)} maxLength={100} placeholder="SKU-001" />
                  </div>
                </div>

                {/* ── Variants ──────────────────────────────────────── */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/50">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-800">Variants</span>
                      <span className="text-xs text-neutral-400">(optional — size, colour, flavour, etc.)</span>
                      {variantRows.length > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {variantRows.length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setVariantRows((rows) => [...rows, newVariantRow()])}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add variant
                    </button>
                  </div>

                  {variantsLoading ? (
                    <div className="flex items-center gap-2 px-4 pb-4 text-sm text-neutral-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading variants…
                    </div>
                  ) : variantsError ? (
                    <div className="px-4 pb-4">
                      <p className="mb-2 text-sm text-red-600">{variantsError}</p>
                      <button
                        type="button"
                        onClick={() => editingProductId && void loadVariants(editingProductId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        Retry
                      </button>
                    </div>
                  ) : variantRows.length > 0 ? (
                    <div className="border-t border-neutral-200 px-4 pb-4 pt-3 space-y-2">
                      <p className="text-xs text-neutral-500 mb-3">
                        Each variant can override the base price. Leave price blank to use the product price. Variants are saved when you click <strong>Save product</strong>.
                      </p>
                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_90px_72px_88px_44px_28px] items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                        <span>Name <span className="text-red-400">*</span></span>
                        <span>Price</span>
                        <span>Stock</span>
                        <span>SKU</span>
                        <span>Active</span>
                        <span />
                      </div>
                      {variantRows.map((row) => (
                        <div
                          key={row.localId}
                          className="grid grid-cols-[1fr_90px_72px_88px_44px_28px] items-center gap-2"
                        >
                          <input
                            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                            value={row.name}
                            onChange={(e) => updateRow(row.localId, { name: e.target.value })}
                            placeholder="e.g. Large / Red"
                            maxLength={100}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                            value={row.priceAmount}
                            onChange={(e) => updateRow(row.localId, { priceAmount: e.target.value })}
                            placeholder="Base"
                          />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                            value={row.stockQty}
                            onChange={(e) => updateRow(row.localId, { stockQty: e.target.value })}
                          />
                          <input
                            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                            value={row.sku}
                            onChange={(e) => updateRow(row.localId, { sku: e.target.value })}
                            placeholder="SKU"
                            maxLength={100}
                          />
                          <label className="flex cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              checked={row.isActive}
                              onChange={(e) => updateRow(row.localId, { isActive: e.target.checked })}
                              className="h-4 w-4 accent-primary"
                              title="Active"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeVariantRow(row)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50"
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-4 pb-4 text-xs text-neutral-400">
                      No variants yet. Click &ldquo;Add variant&rdquo; to define sizes, colours, flavours, or any other options.
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Description <span className="text-red-500">*</span></label>
                  <textarea
                    rows={4}
                    className={`${INPUT} resize-y`}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    maxLength={5000}
                    placeholder="Describe your product — materials, features, dimensions, etc."
                  />
                  <p className="text-xs text-neutral-400">Min 10 characters · max 5 000</p>
                </div>

                {/* Images */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className={LABEL}>
                      Product images <span className="text-red-500">*</span>
                      <span className="ml-1.5 font-normal text-neutral-400">(max 10)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFilePick(e.target.files)}
                      />
                      <button
                        type="button"
                        disabled={form.images.length >= 10}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Upload from device
                      </button>
                      <button
                        type="button"
                        disabled={form.images.length >= 10}
                        onClick={addImageSlot}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add URL
                      </button>
                    </div>
                  </div>

                  {form.images.length === 0 && (
                    <p className="rounded-lg border border-dashed border-neutral-300 py-6 text-center text-sm text-neutral-400">
                      No images yet — upload files or paste URLs above.
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {form.images.map((slot, index) => (
                      <div key={index} className="group relative flex flex-col gap-1.5">
                        {slot.kind === "file" ? (
                          <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={slot.preview} alt="preview" className="h-full w-full object-cover" />
                            {slot.uploading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              </div>
                            )}
                            <button type="button" onClick={() => removeImageSlot(index)} className="absolute right-1 top-1 hidden rounded-full bg-white p-1 shadow group-hover:flex">
                              <X className="h-3.5 w-3.5 text-neutral-700" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative flex flex-col gap-1">
                            {slot.url ? (
                              <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={slot.url} alt="product" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                                <button type="button" onClick={() => removeImageSlot(index)} className="absolute right-1 top-1 hidden rounded-full bg-white p-1 shadow group-hover:flex">
                                  <X className="h-3.5 w-3.5 text-neutral-700" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative flex aspect-square items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
                                <ImageIcon className="h-6 w-6 text-neutral-300" />
                                <button type="button" onClick={() => removeImageSlot(index)} className="absolute right-1 top-1 hidden rounded-full bg-white p-1 shadow group-hover:flex">
                                  <X className="h-3.5 w-3.5 text-neutral-700" />
                                </button>
                              </div>
                            )}
                            <input
                              className="w-full rounded border border-neutral-200 px-2 py-1 text-[11px] text-neutral-600 outline-none focus:border-primary"
                              value={slot.url}
                              onChange={(e) => updateUrlSlot(index, e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </form>
            </div>

            {/* modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create listing")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
