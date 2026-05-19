"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
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
  isActive: boolean;
  createdAt: string;
};

/** An image slot: either already uploaded (url) or pending local file */
type ImageSlot =
  | { kind: "url"; url: string }
  | { kind: "file"; file: File; preview: string; uploading: boolean };

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

/* ─── Helpers ─────────────────────────────────────────────────────────── */

const CURRENCIES = ["USD", "AED", "SAR", "PKR", "GBP", "EUR"] as const;

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

function toFormState(product: VendorProduct): ProductFormState {
  return {
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    images: product.images.map((url) => ({ kind: "url", url })),
    sku: product.sku ?? "",
    currency: product.currency,
    priceAmount: String(product.priceAmount / 100),
    stockQty: String(product.stockQty),
  };
}

function approvalBadgeClass(status: ProductApprovalStatus) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "ARCHIVED") return "bg-neutral-100 text-neutral-600 ring-neutral-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

/* ─── Style constants ─────────────────────────────────────────────────── */

const INPUT =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const LABEL = "block text-sm font-medium text-neutral-700";

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function VendorProductsPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("VENDOR");
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const isEdit = Boolean(editingProductId);

  /* ── Data fetching ────────────────────────────────────────────────── */

  const fetchData = useCallback(async (silent = false) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/vendor/products", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/catalog/categories"),
      ]);
      const [productsData, categoriesData] = await Promise.all([
        parseApiResponse<VendorProduct[]>(productsRes),
        parseApiResponse<Category[]>(categoriesRes),
      ]);
      setProducts(productsData);
      const active = categoriesData.filter((c) => c.isActive);
      setCategories(active);
      setForm((prev) =>
        prev.categoryId ? prev : { ...prev, categoryId: active[0]?.id ?? "" }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void fetchData();
  }, [authLoading, user, fetchData]);

  /* ── Form helpers ─────────────────────────────────────────────────── */

  const updateField = <K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = useCallback(() => {
    setEditingProductId(null);
    setForm((prev) => emptyForm(prev.categoryId));
  }, []);

  const startEdit = (product: VendorProduct) => {
    setEditingProductId(product.id);
    setForm(toFormState(product));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ── Image slot helpers ───────────────────────────────────────────── */

  const addImageSlot = () => {
    updateField("images", [...form.images, { kind: "url", url: "" }]);
  };

  const removeImageSlot = (index: number) => {
    const next = form.images.filter((_, i) => i !== index);
    // revoke object URL to free memory
    const removed = form.images[index];
    if (removed.kind === "file") URL.revokeObjectURL(removed.preview);
    updateField("images", next);
  };

  const updateUrlSlot = (index: number, url: string) => {
    setForm((prev) => {
      const next = [...prev.images];
      next[index] = { kind: "url", url };
      return { ...prev, images: next };
    });
  };

  /* ── File pick → local preview ────────────────────────────────────── */

  const handleFilePick = (files: FileList | null) => {
    if (!files) return;
    const newSlots: ImageSlot[] = Array.from(files).map((file) => ({
      kind: "file",
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }));
    updateField("images", [...form.images, ...newSlots]);
  };

  /* ── Upload a single file slot → return Cloudinary URL ───────────── */

  const uploadFileSlot = async (
    slot: Extract<ImageSlot, { kind: "file" }>,
    index: number,
    token: string
  ): Promise<string> => {
    // mark as uploading
    setForm((prev) => {
      const next = [...prev.images];
      next[index] = { ...slot, uploading: true };
      return { ...prev, images: next };
    });

    const fd = new FormData();
    fd.set("file", slot.file);
    const res = await fetch("/api/vendor/products/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await parseApiResponse<{ url: string }>(res);

    // replace file slot with resolved URL slot
    setForm((prev) => {
      const next = [...prev.images];
      URL.revokeObjectURL(slot.preview);
      next[index] = { kind: "url", url: data.url };
      return { ...prev, images: next };
    });

    return data.url;
  };

  /* ── Submit ───────────────────────────────────────────────────────── */

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // Basic validation
    if (!form.categoryId) {
      toast.error("Category required", "Select a category before saving.");
      return;
    }
    if (form.name.trim().length < 2) {
      toast.error("Name too short", "Product name must be at least 2 characters.");
      return;
    }
    if (form.description.trim().length < 10) {
      toast.error("Description too short", "Description must be at least 10 characters.");
      return;
    }

    const priceRaw = Number(form.priceAmount);
    if (!Number.isFinite(priceRaw) || priceRaw <= 0) {
      toast.error("Invalid price", "Enter a price greater than 0.");
      return;
    }
    const priceAmount = Math.round(priceRaw * 100);

    const stockQty = Number(form.stockQty);
    if (!Number.isInteger(stockQty) || stockQty < 0) {
      toast.error("Invalid stock", "Stock quantity must be 0 or more.");
      return;
    }

    setSaving(true);
    try {
      // Upload any pending file slots sequentially
      const resolvedUrls: string[] = [];
      for (let i = 0; i < form.images.length; i++) {
        const slot = form.images[i];
        if (slot.kind === "file") {
          const url = await uploadFileSlot(slot, i, token);
          resolvedUrls.push(url);
        } else if (slot.url.trim()) {
          resolvedUrls.push(slot.url.trim());
        }
      }

      if (resolvedUrls.length === 0) {
        toast.error("Images required", "Add at least one product image.");
        setSaving(false);
        return;
      }

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

      const endpoint = isEdit
        ? `/api/vendor/products/${editingProductId}`
        : "/api/vendor/products";
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      await parseApiResponse<VendorProduct>(res);
      toast.success(
        isEdit ? "Product updated" : "Product created",
        isEdit ? "Changes saved successfully." : "Your listing is now in draft."
      );
      resetForm();
      await fetchData(true);
    } catch (err) {
      toast.error("Could not save", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ───────────────────────────────────────────────────────── */

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
      toast.success("Product deleted", "The listing has been removed.");
      if (editingProductId === productId) resetForm();
      await fetchData(true);
    } catch (err) {
      toast.error("Could not delete", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Guard ────────────────────────────────────────────────────────── */

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  /* ─── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 pb-16">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f3460]">
          Product Management
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Create, edit, and delete product listings. New listings start as drafts and
          require admin approval before going live.
        </p>
      </div>

      {/* ── Create / Edit form ──────────────────────────────────────── */}
      <div
        ref={formRef}
        className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-neutral-900">
            {isEdit ? "Edit product" : "New product listing"}
          </h2>
          {isEdit && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          {/* Name + Category */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>
                Product name <span className="text-red-500">*</span>
              </label>
              <input
                className={INPUT}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                maxLength={160}
                placeholder="e.g. Premium Saffron Honey"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                className={INPUT}
                value={form.categoryId}
                onChange={(e) => updateField("categoryId", e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price row */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                className={INPUT}
                value={form.currency}
                onChange={(e) => updateField("currency", e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={INPUT}
                value={form.priceAmount}
                onChange={(e) => updateField("priceAmount", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>
                Stock qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className={INPUT}
                value={form.stockQty}
                onChange={(e) => updateField("stockQty", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>SKU (optional)</label>
              <input
                className={INPUT}
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                maxLength={100}
                placeholder="SKU-001"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>
              Description <span className="text-red-500">*</span>
            </label>
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
                {/* Upload from device */}
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
                {/* Paste URL */}
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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {form.images.map((slot, index) => (
                <div
                  key={index}
                  className="group relative flex flex-col gap-1.5"
                >
                  {slot.kind === "file" ? (
                    /* Local file preview */
                    <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slot.preview}
                        alt="preview"
                        className="h-full w-full object-cover"
                      />
                      {slot.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImageSlot(index)}
                        className="absolute right-1 top-1 hidden rounded-full bg-white p-1 shadow group-hover:flex"
                      >
                        <X className="h-3.5 w-3.5 text-neutral-700" />
                      </button>
                    </div>
                  ) : (
                    /* URL slot */
                    <div className="relative flex flex-col gap-1">
                      {slot.url ? (
                        <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slot.url}
                            alt="product"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImageSlot(index)}
                            className="absolute right-1 top-1 hidden rounded-full bg-white p-1 shadow group-hover:flex"
                          >
                            <X className="h-3.5 w-3.5 text-neutral-700" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative flex aspect-square items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
                          <ImageIcon className="h-6 w-6 text-neutral-300" />
                          <button
                            type="button"
                            onClick={() => removeImageSlot(index)}
                            className="absolute right-1 top-1 hidden rounded-full bg-white p-1 shadow group-hover:flex"
                          >
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

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save changes"
                  : "Create listing"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Listings table ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">Your listings</h2>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : products.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No listings yet. Create your first product above.
          </p>
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
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-b border-neutral-100 text-neutral-700 transition-colors ${
                      editingProductId === product.id ? "bg-primary/5" : "hover:bg-neutral-50"
                    }`}
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
                        {product.approvalStatus.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
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
  );
}
