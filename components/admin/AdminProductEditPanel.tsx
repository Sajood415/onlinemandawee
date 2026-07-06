"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";

import type { ProductApprovalStatus } from "@/domain/catalog/product-approval-status";
import { ProductTranslationFields } from "@/components/products/ProductTranslationFields";
import {
  buildTranslationsPayload,
  translationFieldsFromProduct,
  type ProductTranslationFormFields,
} from "@/components/products/product-translation-form";
import { deriveProductFieldsFromStoredVariants } from "@/lib/products/derive-variant-product-fields";
import type { ProductTranslations } from "@/lib/localization/product-content";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type Category = { id: string; name: string; isActive: boolean };

type ProductVariant = {
  id: string;
  name: string;
  priceAmount: number | null;
  stockQty: number;
  sku: string | null;
  isActive: boolean;
};

type EditableProduct = {
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
  category: { id: string; name: string };
};

type Props = {
  product: EditableProduct;
  onSaved: (product: EditableProduct) => void;
  onCancel: () => void;
};

type ImageSlot =
  | { kind: "url"; url: string }
  | { kind: "file"; file: File; preview: string; uploading: boolean };

type FormState = {
  categoryId: string;
  name: string;
  description: string;
  translations: ProductTranslationFormFields;
  images: ImageSlot[];
  sku: string;
  currency: string;
  priceAmount: string;
  stockQty: string;
  approvalStatus: ProductApprovalStatus;
  rejectionReason: string;
  isActive: boolean;
};

const CURRENCIES = ["AFN", "USD", "AED", "SAR", "PKR", "GBP", "EUR"] as const;
const APPROVAL_STATUSES: ProductApprovalStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
];

const INPUT =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const LABEL = "text-sm font-medium text-neutral-700";

function productToForm(product: EditableProduct): FormState {
  return {
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    translations: translationFieldsFromProduct(product.translations),
    images: product.images.map((url) => ({ kind: "url", url })),
    sku: product.sku ?? "",
    currency: product.currency || "USD",
    priceAmount: String(product.priceAmount / 100),
    stockQty: String(product.stockQty),
    approvalStatus: product.approvalStatus,
    rejectionReason: product.rejectionReason ?? "",
    isActive: product.isActive,
  };
}


export function AdminProductEditPanel({ product, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => productToForm(product));
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasVariants = variants.length > 0;
  const showBasePricingFields = !variantsLoading && variants.length === 0;

  useEffect(() => {
    setForm(productToForm(product));
  }, [product]);

  useEffect(() => {
    setCategoriesLoading(true);
    fetchWithAuth("/api/admin/categories")
      .then((res) => parseApiResponse<Category[]>(res))
      .then(setCategories)
      .catch(() => toast.error("Could not load categories"))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    setVariantsLoading(true);
    fetchWithAuth(`/api/admin/products/${product.id}/variants`)
      .then((res) => parseApiResponse<ProductVariant[]>(res))
      .then(setVariants)
      .catch(() => {
        setVariants([]);
        toast.error("Could not load variants");
      })
      .finally(() => setVariantsLoading(false));
  }, [product.id]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateTranslationField = <K extends keyof ProductTranslationFormFields>(
    key: K,
    value: ProductTranslationFormFields[K]
  ) =>
    setForm((prev) => ({
      ...prev,
      translations: { ...prev.translations, [key]: value },
    }));

  const addUrlSlot = () =>
    updateField("images", [...form.images, { kind: "url", url: "" }]);

  const removeImageSlot = (index: number) => {
    const removed = form.images[index];
    if (removed.kind === "file") URL.revokeObjectURL(removed.preview);
    updateField(
      "images",
      form.images.filter((_, i) => i !== index)
    );
  };

  const updateUrlSlot = (index: number, url: string) =>
    setForm((prev) => {
      const next = [...prev.images];
      next[index] = { kind: "url", url };
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

  const uploadFileSlot = async (
    slot: Extract<ImageSlot, { kind: "file" }>,
    index: number
  ): Promise<string> => {
    setForm((prev) => {
      const next = [...prev.images];
      next[index] = { ...slot, uploading: true };
      return { ...prev, images: next };
    });

    const fd = new FormData();
    fd.set("file", slot.file);
    const res = await fetchWithAuth("/api/admin/products/upload", {
      method: "POST",
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.categoryId) {
      toast.error("Category required", "Select a category.");
      return;
    }
    if (form.name.trim().length < 2) {
      toast.error("Name too short", "At least 2 characters.");
      return;
    }
    if (form.description.trim().length < 10) {
      toast.error("Description too short", "At least 10 characters.");
      return;
    }

    const priceRaw = Number(form.priceAmount);
    let priceAmount: number;
    let stockQty: number;

    if (hasVariants) {
      const derived = deriveProductFieldsFromStoredVariants(variants, product.priceAmount);
      priceAmount = derived.priceAmount;
      stockQty = derived.stockQty;
    } else {
      if (!Number.isFinite(priceRaw) || priceRaw <= 0) {
        toast.error("Invalid price", "Enter a price greater than 0.");
        return;
      }
      priceAmount = Math.round(priceRaw * 100);

      stockQty = Number(form.stockQty);
      if (!Number.isInteger(stockQty) || stockQty < 0) {
        toast.error("Invalid stock", "Must be 0 or more.");
        return;
      }
    }

    setSaving(true);
    try {
      const resolvedUrls: string[] = [];
      for (let i = 0; i < form.images.length; i++) {
        const slot = form.images[i];
        if (slot.kind === "file") {
          resolvedUrls.push(await uploadFileSlot(slot, i));
        } else if (slot.url.trim()) {
          resolvedUrls.push(slot.url.trim());
        }
      }
      if (!resolvedUrls.length) {
        toast.error("Images required", "Add at least one image.");
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
        approvalStatus: form.approvalStatus,
        isActive: form.isActive,
      };
      const translations = buildTranslationsPayload(form.translations);
      if (translations) payload.translations = translations;
      if (form.sku.trim() && !hasVariants) payload.sku = form.sku.trim();
      if (form.approvalStatus === "REJECTED") {
        payload.rejectionReason = form.rejectionReason.trim() || null;
      } else {
        payload.rejectionReason = null;
      }

      const res = await fetchWithAuth(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await parseApiResponse<EditableProduct>(res);
      toast.success("Product updated", `"${saved.name}" has been saved.`);
      onSaved(saved);
    } catch (err) {
      toast.error(
        "Could not save",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={LABEL}>Product name (English)</label>
          <input
            className={INPUT}
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            maxLength={160}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Category</label>
          <select
            className={INPUT}
            value={form.categoryId}
            onChange={(e) => updateField("categoryId", e.target.value)}
            disabled={categoriesLoading}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!c.isActive ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Approval status</label>
          <select
            className={INPUT}
            value={form.approvalStatus}
            onChange={(e) =>
              updateField(
                "approvalStatus",
                e.target.value as ProductApprovalStatus
              )
            }
          >
            {APPROVAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ProductTranslationFields
        fields={form.translations}
        onChange={updateTranslationField}
        inputClassName={INPUT}
        labelClassName={LABEL}
      />

      <div className={`grid gap-4 ${showBasePricingFields ? "sm:grid-cols-4" : "sm:grid-cols-1"}`}>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Currency</label>
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
        {showBasePricingFields ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Price</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={INPUT}
                value={form.priceAmount}
                onChange={(e) => updateField("priceAmount", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Stock</label>
              <input
                type="number"
                min="0"
                step="1"
                className={INPUT}
                value={form.stockQty}
                onChange={(e) => updateField("stockQty", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>SKU</label>
              <input
                className={INPUT}
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                maxLength={100}
              />
            </div>
          </>
        ) : null}
      </div>

      {variantsLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading variant details…
        </div>
      ) : hasVariants ? (
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <label className={LABEL}>
              Variants ({variants.length})
            </label>
            <span className="text-xs text-neutral-500">Managed by vendor</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  <th className="px-3 py-2 text-left">Variant</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-left">Active</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => (
                  <tr key={variant.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-neutral-800">{variant.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                      {variant.priceAmount != null
                        ? (variant.priceAmount / 100).toLocaleString(undefined, {
                            style: "currency",
                            currency: form.currency || "USD",
                          })
                        : (
                          <span className="text-neutral-400">
                            {(product.priceAmount / 100).toLocaleString(undefined, {
                              style: "currency",
                              currency: form.currency || "USD",
                            })}
                          </span>
                        )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{variant.stockQty}</td>
                    <td className="px-3 py-2 text-neutral-500">{variant.sku ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          variant.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {variant.isActive ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => updateField("isActive", e.target.checked)}
          className="rounded border-neutral-300"
        />
        Active on storefront
      </label>

      {form.approvalStatus === "REJECTED" && (
        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Rejection reason</label>
          <textarea
            rows={2}
            className={INPUT}
            value={form.rejectionReason}
            onChange={(e) => updateField("rejectionReason", e.target.value)}
            maxLength={500}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className={LABEL}>Description (English)</label>
        <textarea
          rows={4}
          className={INPUT}
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          maxLength={5000}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={LABEL}>Images</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addUrlSlot}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Plus className="h-3.5 w-3.5" />
              URL
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
              <Upload className="h-3.5 w-3.5" />
              Upload
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files)}
              />
            </label>
          </div>
        </div>

        {form.images.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-200 px-3 py-6 text-sm text-neutral-400">
            <ImageIcon className="h-4 w-4" />
            No images yet
          </div>
        ) : (
          <div className="space-y-2">
            {form.images.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                {slot.kind === "file" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slot.preview}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : slot.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slot.url}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                    <ImageIcon className="h-5 w-5 text-neutral-300" />
                  </div>
                )}
                {slot.kind === "url" ? (
                  <input
                    className={`${INPUT} min-w-0 flex-1`}
                    value={slot.url}
                    onChange={(e) => updateUrlSlot(i, e.target.value)}
                    placeholder="https://…"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">
                    {slot.uploading ? "Uploading…" : slot.file.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImageSlot(i)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
