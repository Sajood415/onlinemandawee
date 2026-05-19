"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, ToggleLeft, ToggleRight, X } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

/* ─── Types ──────────────────────────────────────────────────────────── */

type Category = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string }[];
  _count?: { products: number };
};

/* ─── Style helpers ──────────────────────────────────────────────────── */

const INPUT =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const LABEL = "block text-sm font-medium text-neutral-700";

/* ─── Page ────────────────────────────────────────────────────────────── */

export default function AdminCategoriesPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* form state */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formParentId, setFormParentId] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  /* ── Fetch ──────────────────────────────────────────────────────── */

  const fetchCategories = useCallback(async (silent = false) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  /* ── Form helpers ───────────────────────────────────────────────── */

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormSortOrder("0");
    setFormParentId("");
    setFormIsActive(true);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormSortOrder(String(cat.sortOrder));
    setFormParentId(cat.parentId ?? "");
    setFormIsActive(cat.isActive);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Submit (create or update) ──────────────────────────────────── */

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (!formName.trim()) {
      toast.error("Name required", "Enter a category name.");
      return;
    }

    const payload: Record<string, unknown> = {
      name: formName.trim(),
      sortOrder: Number(formSortOrder) || 0,
      isActive: formIsActive,
    };
    if (formParentId) payload.parentId = formParentId;

    setSaving(true);
    try {
      const endpoint = editingId
        ? `/api/admin/categories/${editingId}`
        : "/api/admin/categories";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      await parseApiResponse<Category>(res);
      toast.success(
        editingId ? "Category updated" : "Category created",
        editingId ? "Changes saved." : "New category has been added."
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
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setTogglingId(cat.id);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: cat.name,
          sortOrder: cat.sortOrder,
          isActive: !cat.isActive,
          ...(cat.parentId ? { parentId: cat.parentId } : {}),
        }),
      });
      await parseApiResponse<Category>(res);
      toast.success(
        cat.isActive ? "Category hidden" : "Category activated",
        cat.isActive
          ? `"${cat.name}" is now inactive.`
          : `"${cat.name}" is now active.`
      );
      await fetchCategories(true);
    } catch (err) {
      toast.error("Toggle failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTogglingId(null);
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

  const filtered = search.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.includes(search.toLowerCase())
      )
    : categories;

  const topLevel = filtered.filter((c) => !c.parentId);
  const topLevelSelectOptions = categories.filter((c) => !c.parentId);

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f3460]">
          Category Management
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Create, edit, and toggle visibility of product categories.
          These categories appear in the vendor product dropdown and on the storefront.
        </p>
      </div>

      {/* ── Create / Edit form ──────────────────────────────────── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-neutral-900">
            {editingId ? "Edit category" : "New category"}
          </h2>
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
                Name <span className="text-red-500">*</span>
              </label>
              <input
                className={INPUT}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={120}
                placeholder="e.g. Dried Fruits & Nuts"
              />
            </div>

            {/* Parent category */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Parent category (optional)</label>
              <select
                className={INPUT}
                value={formParentId}
                onChange={(e) => setFormParentId(e.target.value)}
              >
                <option value="">— None (top-level) —</option>
                {topLevelSelectOptions.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === editingId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

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
          </div>

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
              {saving ? "Saving…" : editingId ? "Save changes" : (
                <>
                  <Plus className="h-4 w-4" />
                  Create category
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
            All categories
            {!loading && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
                {categories.length}
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
        ) : filtered.length === 0 ? (
          <p className="text-sm text-neutral-500">No categories found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Parent</th>
                  <th className="px-3 py-2">Sub-categories</th>
                  <th className="px-3 py-2">Sort</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr
                    key={cat.id}
                    className={`border-b border-neutral-100 transition-colors ${
                      editingId === cat.id ? "bg-primary/5" : "hover:bg-neutral-50"
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-neutral-900">{cat.name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-neutral-500">{cat.slug}</td>
                    <td className="px-3 py-3 text-neutral-600">
                      {cat.parent?.name ?? <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-neutral-600">
                      {cat.children?.length > 0 ? (
                        <span className="text-xs text-neutral-500">
                          {cat.children.map((c) => c.name).join(", ")}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-neutral-600">{cat.sortOrder}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                          cat.isActive
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-neutral-100 text-neutral-500 ring-neutral-200"
                        }`}
                      >
                        {cat.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        {/* Toggle active */}
                        <button
                          type="button"
                          disabled={togglingId === cat.id}
                          onClick={() => void toggleActive(cat)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
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
