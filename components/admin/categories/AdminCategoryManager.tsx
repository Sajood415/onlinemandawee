"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Pencil, Plus, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import { CategoryTranslationFields } from "@/components/categories/CategoryTranslationFields";
import {
  buildCategoryTranslationsPayload,
  categoryTranslationFieldsFromRecord,
  emptyCategoryTranslationFields,
  type CategoryTranslationFormFields,
} from "@/components/categories/category-translation-form";
import {
  parseCategoryImageUrl,
  type CategoryTranslations,
} from "@/lib/localization/category-content";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { toast } from "@/lib/utils/toast";

/* ─── Types ──────────────────────────────────────────────────────────── */

type Category = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  translations?: CategoryTranslations | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string }[];
  _count?: { products: number };
};

export type AdminCategoryManagerMode = "top-level" | "sub";

type AdminCategoryManagerProps = {
  mode: AdminCategoryManagerMode;
};

/* ─── Style helpers ──────────────────────────────────────────────────── */

const INPUT =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const LABEL = "block text-sm font-medium text-neutral-700";

/* ─── Page ────────────────────────────────────────────────────────────── */

export function AdminCategoryManager({ mode }: AdminCategoryManagerProps) {
  const isSubMode = mode === "sub";
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* form state */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formTranslations, setFormTranslations] = useState<CategoryTranslationFormFields>(
    emptyCategoryTranslationFields()
  );
  const [formImageUrl, setFormImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formParentId, setFormParentId] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const formSectionRef = useRef<HTMLDivElement>(null);

  /* ── Fetch ──────────────────────────────────────────────────────── */

  const fetchCategories = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/admin/categories");
      const data = await parseApiResponse<Category[]>(res);
      setCategories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void fetchCategories();
  }, [authLoading, user, fetchCategories]);

  /* ── Scoped lists ───────────────────────────────────────────────── */

  const topLevelCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );
  const subCategories = useMemo(
    () => categories.filter((c) => Boolean(c.parentId)),
    [categories]
  );
  const scopedCategories = isSubMode ? subCategories : topLevelCategories;

  /* ── Form helpers ───────────────────────────────────────────────── */

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormTranslations(emptyCategoryTranslationFields());
    setFormImageUrl("");
    setFormSortOrder("0");
    setFormParentId("");
    setFormIsActive(true);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormTranslations(categoryTranslationFieldsFromRecord(cat.translations));
    setFormImageUrl(parseCategoryImageUrl(cat.translations) ?? "");
    setFormSortOrder(String(cat.sortOrder));
    setFormParentId(cat.parentId ?? "");
    setFormIsActive(cat.isActive);
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const onUploadCategoryImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetchWithAuth("/api/admin/categories/upload", {
        method: "POST",
        body: form,
      });
      const data = await parseApiResponse<{ url: string }>(res);
      setFormImageUrl(data.url);
      toast.success("Uploaded", "Category image uploaded.");
    } catch (err) {
      toast.error("Upload failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploadingImage(false);
    }
  };

  /* ── Submit (create or update) ──────────────────────────────────── */

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error("Name required", "Enter a category name.");
      return;
    }

    if (isSubMode && !formParentId) {
      toast.error("Parent category required", "Select which category this belongs under.");
      return;
    }

    const payload: Record<string, unknown> = {
      name: formName.trim(),
      imageUrl: formImageUrl.trim() || (editingId ? null : undefined),
      sortOrder: Number(formSortOrder) || 0,
      isActive: formIsActive,
    };
    if (isSubMode) {
      payload.parentId = formParentId;
    }
    const translations = buildCategoryTranslationsPayload(formTranslations);
    if (translations) payload.translations = translations;

    setSaving(true);
    try {
      const endpoint = editingId
        ? `/api/admin/categories/${editingId}`
        : "/api/admin/categories";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetchWithAuth(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await parseApiResponse<Category>(res);
      toast.success(
        editingId ? "Saved" : "Created",
        editingId
          ? "Changes saved."
          : isSubMode
            ? "New sub-category has been added."
            : "New category has been added."
      );
      resetForm();
      await fetchCategories(true);
    } catch (err) {
      toast.error("Could not save", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Toggle active / inactive ───────────────────────────────────── */

  const toggleActive = async (cat: Category) => {
    setTogglingId(cat.id);
    try {
      const res = await fetchWithAuth(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cat.name,
          sortOrder: cat.sortOrder,
          isActive: !cat.isActive,
          ...(cat.parentId ? { parentId: cat.parentId } : {}),
        }),
      });
      await parseApiResponse<Category>(res);
      toast.success(
        cat.isActive ? "Hidden" : "Activated",
        cat.isActive ? `"${cat.name}" is now inactive.` : `"${cat.name}" is now active.`
      );
      await fetchCategories(true);
    } catch (err) {
      toast.error("Toggle failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTogglingId(null);
    }
  };

  /* ── Delete ─────────────────────────────────────────────────────── */

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    if (!isSubMode && deleteTarget.children.length > 0) {
      toast.error(
        "Cannot delete",
        "This category has sub-categories. Delete or move them first."
      );
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/admin/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });
      await parseApiResponse<{ id: string }>(res);
      toast.success("Deleted", `"${deleteTarget.name}" was deleted.`);
      setCategories((current) => current.filter((c) => c.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
    } catch (err) {
      toast.error("Could not delete", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Filtered list ──────────────────────────────────────────────── */

  const filtered = search.trim()
    ? scopedCategories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.includes(search.toLowerCase())
      )
    : scopedCategories;

  const columns = useMemo<ColumnDef<Category>[]>(() => {
    const base: ColumnDef<Category>[] = [
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">{row.original.name}</span>
        ),
      },
      {
        header: "Slug",
        accessorKey: "slug",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-neutral-500">{row.original.slug}</span>
        ),
      },
    ];

    if (isSubMode) {
      base.push({
        header: "Parent category",
        id: "parent",
        cell: ({ row }) =>
          row.original.parent?.name ?? <span className="text-neutral-300">—</span>,
      });
    } else {
      base.push({
        header: "Sub-categories",
        id: "children",
        cell: ({ row }) =>
          row.original.children?.length > 0 ? (
            <span className="text-xs text-neutral-500">
              {row.original.children.map((c) => c.name).join(", ")}
            </span>
          ) : (
            <span className="text-neutral-300">—</span>
          ),
      });
    }

    base.push(
      {
        header: "Sort",
        accessorKey: "sortOrder",
        cell: ({ row }) => (
          <span className="tabular-nums text-neutral-600">{row.original.sortOrder}</span>
        ),
      },
      {
        header: "Status",
        id: "status",
        cell: ({ row }) => {
          const cat = row.original;
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                cat.isActive
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-neutral-100 text-neutral-500 ring-neutral-200"
              }`}
            >
              {cat.isActive ? "Active" : "Inactive"}
            </span>
          );
        },
      },
      {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => {
          const cat = row.original;
          return (
            <div
              className="flex items-center gap-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => startEdit(cat)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                disabled={togglingId === cat.id}
                onClick={() => void toggleActive(cat)}
                className={`inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                  cat.isActive
                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {togglingId === cat.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : cat.isActive ? (
                  <ToggleRight className="h-3.5 w-3.5" />
                ) : (
                  <ToggleLeft className="h-3.5 w-3.5" />
                )}
                {cat.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(cat)}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          );
        },
      }
    );

    return base;
  }, [isSubMode, togglingId]);

  /* ── Guard ──────────────────────────────────────────────────────── */

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f3460]">
          {isSubMode ? "Sub-category Management" : "Category Management"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {isSubMode
            ? "Create, edit, and delete sub-categories that sit under a parent category. These appear nested under their parent in the vendor product dropdown and on the storefront."
            : "Create, edit, and delete top-level product categories. Manage the sub-categories nested under each one from the Sub-categories page."}
        </p>
      </div>

      {/* ── Create / Edit form ──────────────────────────────────── */}
      <div
        ref={formSectionRef}
        className={`scroll-mt-4 rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${
          editingId ? "border-primary/30 ring-2 ring-primary/15" : "border-neutral-200"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              {editingId
                ? isSubMode
                  ? "Edit sub-category"
                  : "Edit category"
                : isSubMode
                  ? "New sub-category"
                  : "New category"}
            </h2>
            {editingId ? (
              <p className="mt-1 text-sm text-neutral-500">
                Update the fields below, then click Save changes.
              </p>
            ) : null}
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className={LABEL}>
                Name (English) <span className="text-red-500">*</span>
              </label>
              <input
                className={INPUT}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={120}
                placeholder={isSubMode ? "e.g. Almonds" : "e.g. Dried Fruits & Nuts"}
              />
            </div>

            {editingId ? (
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <label className={LABEL}>Slug</label>
                <input
                  className={`${INPUT} bg-neutral-50 text-neutral-500`}
                  value={categories.find((category) => category.id === editingId)?.slug ?? ""}
                  readOnly
                  aria-readonly
                />
              </div>
            ) : null}

            {/* Parent category (sub-categories only) */}
            {isSubMode ? (
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>
                  Parent category <span className="text-red-500">*</span>
                </label>
                <select
                  className={INPUT}
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                >
                  <option value="">— Select a category —</option>
                  {topLevelCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Sort order */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Sort order</label>
              <input
                type="number"
                min="0"
                className={INPUT}
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Category image */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className={LABEL}>Category image</label>
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Upload image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void onUploadCategoryImage(file);
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {formImageUrl ? (
                  <p className="text-xs text-emerald-700">Image uploaded.</p>
                ) : null}
              </div>
            </div>
          </div>

          <CategoryTranslationFields
            fields={formTranslations}
            onChange={(key, value) =>
              setFormTranslations((prev) => ({ ...prev, [key]: value }))
            }
            inputClassName={INPUT}
            labelClassName={LABEL}
          />

          {/* Active toggle */}
          <label className="inline-flex cursor-pointer items-center gap-2.5">
            <span className="relative inline-flex h-5 w-9 shrink-0">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-neutral-300 transition peer-checked:bg-primary" />
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </span>
            <span className="text-sm font-medium text-neutral-700">
              {formIsActive ? "Active (visible to vendors & customers)" : "Inactive (hidden)"}
            </span>
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? (
                "Saving…"
              ) : editingId ? (
                "Save changes"
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {isSubMode ? "Create sub-category" : "Create category"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Categories list ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-neutral-900">
            {isSubMode ? "All sub-categories" : "All categories"}
            {!loading && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
                {scopedCategories.length}
              </span>
            )}
          </h2>
          <input
            className="min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-60"
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            emptyMessage={isSubMode ? "No sub-categories found." : "No categories found."}
            initialPageSize={10}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* ── Delete confirmation modal ────────────────────────────── */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-neutral-900">Delete category?</h2>
            <p className="mt-2 text-sm text-neutral-600">
              This will permanently delete <span className="font-semibold">“{deleteTarget.name}”</span>.
              This action cannot be undone.
            </p>
            {!isSubMode && deleteTarget.children.length > 0 ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This category has {deleteTarget.children.length} sub-categor
                {deleteTarget.children.length === 1 ? "y" : "ies"}. Delete or move them first.
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
