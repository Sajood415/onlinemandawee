"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Pencil, Plus, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("AdminPages.categories");
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
      setError(e instanceof Error ? e.message : t("toasts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      toast.success(t("toasts.uploaded"), t("toasts.uploadedBody"));
    } catch (err) {
      toast.error(
        t("toasts.uploadFailed"),
        err instanceof Error ? err.message : t("toasts.genericError")
      );
    } finally {
      setUploadingImage(false);
    }
  };

  /* ── Submit (create or update) ──────────────────────────────────── */

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error(t("toasts.nameRequired"), t("toasts.nameRequiredBody"));
      return;
    }

    if (isSubMode && !formParentId) {
      toast.error(t("toasts.parentRequired"), t("toasts.parentRequiredBody"));
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
      toast.success(editingId ? t("toasts.saved") : t("toasts.created"));
      resetForm();
      await fetchCategories(true);
    } catch (err) {
      toast.error(
        t("toasts.saveFailed"),
        err instanceof Error ? err.message : t("toasts.genericError")
      );
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
      toast.success(cat.isActive ? t("toasts.deactivated") : t("toasts.activated"));
      await fetchCategories(true);
    } catch (err) {
      toast.error(
        t("toasts.toggleFailed"),
        err instanceof Error ? err.message : t("toasts.genericError")
      );
    } finally {
      setTogglingId(null);
    }
  };

  /* ── Delete ─────────────────────────────────────────────────────── */

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    if (!isSubMode && deleteTarget.children.length > 0) {
      toast.error(t("toasts.hasChildren"), t("toasts.hasChildrenBody"));
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/admin/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });
      await parseApiResponse<{ id: string }>(res);
      toast.success(
        t("toasts.deleted"),
        t("toasts.deletedBody", { name: deleteTarget.name })
      );
      setCategories((current) => current.filter((c) => c.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        t("toasts.deleteFailed"),
        err instanceof Error ? err.message : t("toasts.genericError")
      );
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
        header: t("columns.name"),
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">{row.original.name}</span>
        ),
      },
      {
        header: t("columns.slug"),
        accessorKey: "slug",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-neutral-500">{row.original.slug}</span>
        ),
      },
    ];

    if (isSubMode) {
      base.push({
        header: t("columns.parent"),
        id: "parent",
        cell: ({ row }) =>
          row.original.parent?.name ?? <span className="text-neutral-300">—</span>,
      });
    } else {
      base.push({
        header: t("columns.children"),
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
        header: t("columns.sort"),
        accessorKey: "sortOrder",
        cell: ({ row }) => (
          <span className="tabular-nums text-neutral-600">{row.original.sortOrder}</span>
        ),
      },
      {
        header: t("columns.status"),
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
              {cat.isActive ? t("active") : t("inactive")}
            </span>
          );
        },
      },
      {
        header: t("columns.actions"),
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
                {t("edit")}
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
                {cat.isActive ? t("deactivate") : t("activate")}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(cat)}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("delete")}
              </button>
            </div>
          );
        },
      }
    );

    return base;
  }, [isSubMode, togglingId, t]);

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
          {isSubMode ? t("titleSub") : t("title")}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {isSubMode ? t("subtitleSub") : t("subtitle")}
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
                  ? t("editSubCategory")
                  : t("editCategory")
                : isSubMode
                  ? t("newSubCategory")
                  : t("newCategory")}
            </h2>
            {editingId ? (
              <p className="mt-1 text-sm text-neutral-500">{t("editHint")}</p>
            ) : null}
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <X className="h-3.5 w-3.5" />
              {t("cancel")}
            </button>
          )}
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className={LABEL}>
                {t("nameEn")} <span className="text-red-500">*</span>
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
                <label className={LABEL}>{t("slug")}</label>
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
                  {t("parentCategory")} <span className="text-red-500">*</span>
                </label>
                <select
                  className={INPUT}
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                >
                  <option value="">{t("selectParent")}</option>
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
              <label className={LABEL}>{t("sortOrder")}</label>
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
              <label className={LABEL}>{t("categoryImage")}</label>
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {t("uploadImage")}
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
                  <p className="text-xs text-emerald-700">{t("toasts.uploadedBody")}</p>
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
              {formIsActive ? t("active") : t("inactive")}
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
                t("saving")
              ) : editingId ? (
                t("save")
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {isSubMode ? t("createSub") : t("create")}
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
            {isSubMode ? t("listTitleSub") : t("listTitle")}
            {!loading && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
                {scopedCategories.length}
              </span>
            )}
          </h2>
          <input
            className="min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-60"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" />
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
            emptyMessage={
              search.trim()
                ? t("emptySearch")
                : isSubMode
                  ? t("emptySub")
                  : t("empty")
            }
            initialPageSize={10}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* ── Delete confirmation modal ────────────────────────────── */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-neutral-900">
              {isSubMode ? t("deleteTitleSub") : t("deleteTitle")}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {t("deleteBody", { name: deleteTarget.name })}
            </p>
            {!isSubMode && deleteTarget.children.length > 0 ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {t("toasts.hasChildrenBody")}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? t("deleting") : t("deleteConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
