"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import {
  HOME_BANNER_PLACEMENT_LABELS,
  homeBannerPlacements,
  type HomeBannerPlacement,
} from "@/domain/home/home-banner-placement";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type HomeBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  placement: HomeBannerPlacement;
  imageUrl: string;
  imageMobileUrl: string | null;
  href: string;
  ctaLabel: string | null;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  expiresAt: string | null;
};

type FormState = {
  title: string;
  subtitle: string;
  placement: HomeBannerPlacement;
  imageUrl: string;
  imageMobileUrl: string;
  href: string;
  ctaLabel: string;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  expiresAt: string;
};

const INPUT =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function emptyForm(): FormState {
  return {
    title: "",
    subtitle: "",
    placement: "HERO",
    imageUrl: "",
    imageMobileUrl: "",
    href: "/products",
    ctaLabel: "Shop now",
    isActive: true,
    sortOrder: "0",
    startsAt: "",
    expiresAt: "",
  };
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function formatSchedule(banner: HomeBanner) {
  if (!banner.startsAt && !banner.expiresAt) return "Always on";
  const start = banner.startsAt ? new Date(banner.startsAt).toLocaleString() : "Anytime";
  const end = banner.expiresAt ? new Date(banner.expiresAt).toLocaleString() : "No end";
  return `${start} → ${end}`;
}

export default function AdminBannersPage() {
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<"desktop" | "mobile" | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const desktopFileRef = useRef<HTMLInputElement>(null);
  const mobileFileRef = useRef<HTMLInputElement>(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/home-banners");
      const data = await parseApiResponse<HomeBanner[]>(res);
      setBanners(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load banners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void loadBanners();
  }, [authLoading, user, loadBanners]);

  const uploadImage = async (file: File, field: "desktop" | "mobile") => {
    setUploadingField(field);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetchWithAuth("/api/admin/home-banners/upload", {
        method: "POST",
        body,
      });
      const data = await parseApiResponse<{ url: string }>(res);
      setForm((current) => ({
        ...current,
        ...(field === "desktop"
          ? { imageUrl: data.url }
          : { imageMobileUrl: data.url }),
      }));
      toast.success(field === "desktop" ? "Desktop image uploaded" : "Mobile image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (banner: HomeBanner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      placement: banner.placement,
      imageUrl: banner.imageUrl,
      imageMobileUrl: banner.imageMobileUrl ?? "",
      href: banner.href,
      ctaLabel: banner.ctaLabel ?? "",
      isActive: banner.isActive,
      sortOrder: String(banner.sortOrder),
      startsAt: toDatetimeLocal(banner.startsAt),
      expiresAt: toDatetimeLocal(banner.expiresAt),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.imageUrl || !form.href.trim()) {
      toast.error("Missing fields", "Title, desktop image, and link are required.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      placement: form.placement,
      imageUrl: form.imageUrl,
      imageMobileUrl: form.imageMobileUrl.trim() || null,
      href: form.href.trim(),
      ctaLabel: form.ctaLabel.trim() || null,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
      startsAt: fromDatetimeLocal(form.startsAt),
      expiresAt: fromDatetimeLocal(form.expiresAt),
    };

    setSaving(true);
    try {
      const res = await fetchWithAuth(
        editingId ? `/api/admin/home-banners/${editingId}` : "/api/admin/home-banners",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      await parseApiResponse(res);
      toast.success(editingId ? "Banner updated" : "Banner created");
      closeForm();
      await loadBanners();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save banner");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (banner: HomeBanner) => {
    if (!window.confirm(`Delete banner "${banner.title}"?`)) return;
    try {
      await fetchWithAuth(`/api/admin/home-banners/${banner.id}`, { method: "DELETE" });
      toast.success("Banner deleted");
      if (editingId === banner.id) closeForm();
      await loadBanners();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete banner");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0f3460]">
            Home page banners
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Schedule seasonal promotions (Ramadan, Eid, etc.) with start and end dates.
          </p>
        </div>
        {!showForm ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            New banner
          </button>
        ) : null}
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              {editingId ? "Edit banner" : "New banner"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-neutral-700">Title *</label>
              <input
                className={INPUT}
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                placeholder="Ramadan essentials"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-neutral-700">Subtitle</label>
              <input
                className={INPUT}
                value={form.subtitle}
                onChange={(e) => setForm((c) => ({ ...c, subtitle: e.target.value }))}
                placeholder="Optional supporting line"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Placement *</label>
              <select
                className={INPUT}
                value={form.placement}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    placement: e.target.value as HomeBannerPlacement,
                  }))
                }
              >
                {homeBannerPlacements.map((placement) => (
                  <option key={placement} value={placement}>
                    {HOME_BANNER_PLACEMENT_LABELS[placement]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Sort order</label>
              <input
                type="number"
                min="0"
                className={INPUT}
                value={form.sortOrder}
                onChange={(e) => setForm((c) => ({ ...c, sortOrder: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Link (href) *</label>
              <input
                className={INPUT}
                value={form.href}
                onChange={(e) => setForm((c) => ({ ...c, href: e.target.value }))}
                placeholder="/products or /category/grocery"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">CTA label</label>
              <input
                className={INPUT}
                value={form.ctaLabel}
                onChange={(e) => setForm((c) => ({ ...c, ctaLabel: e.target.value }))}
                placeholder="Shop now"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Display from</label>
              <input
                type="datetime-local"
                className={INPUT}
                value={form.startsAt}
                onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Display until</label>
              <input
                type="datetime-local"
                className={INPUT}
                value={form.expiresAt}
                onChange={(e) => setForm((c) => ({ ...c, expiresAt: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Desktop image *</span>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={uploadingField === "desktop"}
                  onClick={() => desktopFileRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                >
                  {uploadingField === "desktop" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  Upload desktop
                </button>
                <input
                  ref={desktopFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file, "desktop");
                    e.target.value = "";
                  }}
                />
                {form.imageUrl ? (
                  <div className="h-16 w-[200px] shrink-0 overflow-hidden rounded-lg border bg-neutral-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imageUrl}
                      alt="Desktop preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="sm:col-span-2">
              <span className="text-sm font-medium text-neutral-700">
                Mobile image (optional, for hero)
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={uploadingField === "mobile"}
                  onClick={() => mobileFileRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                >
                  {uploadingField === "mobile" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  Upload mobile
                </button>
                <input
                  ref={mobileFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file, "mobile");
                    e.target.value = "";
                  }}
                />
                {form.imageMobileUrl ? (
                  <div className="h-16 w-[120px] shrink-0 overflow-hidden rounded-lg border bg-neutral-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imageMobileUrl}
                      alt="Mobile preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))}
              />
              <span className="text-sm font-medium text-neutral-700">Active</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create banner"}
            </button>
          </div>
        </form>
      ) : null}

      {!showForm ? (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading banners…
          </div>
        ) : banners.length === 0 ? (
          <p className="text-sm text-neutral-500">No banners yet. Create one for Ramadan or Eid.</p>
        ) : (
          <div className="responsive-table-shell overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  <th className="px-3 py-2">Preview</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Placement</th>
                  <th className="px-3 py-2">Schedule</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((banner) => (
                  <tr key={banner.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-3 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="h-12 w-24 rounded object-cover"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-neutral-900">{banner.title}</p>
                      <p className="text-xs text-neutral-500">{banner.href}</p>
                    </td>
                    <td className="px-3 py-3 text-neutral-600">
                      {HOME_BANNER_PLACEMENT_LABELS[banner.placement]}
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-600">
                      {formatSchedule(banner)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          banner.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {banner.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(banner)}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelete(banner)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
      ) : null}
    </div>
  );
}
