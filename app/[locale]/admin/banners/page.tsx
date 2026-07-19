"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ImagePlus, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { DataTable } from "@/components/ui/data-table";
import {
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
    href: "/products",
    ctaLabel: "",
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

function formatDateLabel(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminBannersPage() {
  const t = useTranslations("AdminPages.banners");
  const locale = useLocale();
  const { isLoading: authLoading, user } = useDashboardGuard("ADMIN");
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomeBanner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const imageFileRef = useRef<HTMLInputElement>(null);

  const placementLabel = useCallback(
    (placement: HomeBannerPlacement) =>
      t.has(`placements.${placement}`)
        ? t(`placements.${placement}`)
        : placement,
    [t]
  );

  const formatSchedule = useCallback(
    (banner: HomeBanner) => {
      if (!banner.startsAt && !banner.expiresAt) return t("alwaysOn");
      const start = banner.startsAt
        ? formatDateLabel(banner.startsAt, locale)
        : t("anytime");
      const end = banner.expiresAt
        ? formatDateLabel(banner.expiresAt, locale)
        : t("noEnd");
      return `${start} → ${end}`;
    },
    [locale, t]
  );

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/admin/home-banners");
      const data = await parseApiResponse<HomeBanner[]>(res);
      setBanners(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && user) void loadBanners();
  }, [authLoading, user, loadBanners]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetchWithAuth("/api/admin/home-banners/upload", {
        method: "POST",
        body,
      });
      const data = await parseApiResponse<{ url: string }>(res);
      setForm((current) => ({ ...current, imageUrl: data.url }));
      toast.success(t("imageUploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), ctaLabel: t("form.defaultCta") });
    setShowForm(true);
  };

  const openEdit = (banner: HomeBanner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      placement: banner.placement,
      imageUrl: banner.imageUrl,
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
      toast.error(t("missingFieldsTitle"), t("missingFieldsBody"));
      return;
    }

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      placement: form.placement,
      imageUrl: form.imageUrl,
      imageMobileUrl: null,
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
      toast.success(t("saved"));
      closeForm();
      await loadBanners();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchWithAuth(`/api/admin/home-banners/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success(t("deleted"));
      if (editingId === deleteTarget.id) closeForm();
      setDeleteTarget(null);
      await loadBanners();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<HomeBanner>[]>(
    () => [
      {
        header: t("columns.preview"),
        id: "preview",
        cell: ({ row }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.original.imageUrl}
            alt={row.original.title}
            className="h-12 w-24 rounded object-cover"
          />
        ),
      },
      {
        header: t("columns.title"),
        id: "title",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-neutral-900">{row.original.title}</p>
            <p className="text-xs text-neutral-500">{row.original.href}</p>
          </div>
        ),
      },
      {
        header: t("columns.placement"),
        id: "placement",
        cell: ({ row }) => placementLabel(row.original.placement),
      },
      {
        header: t("columns.schedule"),
        id: "schedule",
        cell: ({ row }) => (
          <span className="text-xs text-neutral-600">{formatSchedule(row.original)}</span>
        ),
      },
      {
        header: t("columns.status"),
        id: "status",
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              row.original.isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {row.original.isActive ? t("active") : t("inactive")}
          </span>
        ),
      },
      {
        header: t("columns.actions"),
        id: "actions",
        cell: ({ row }) => {
          const banner = row.original;
          return (
            <div
              className="flex items-center gap-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => openEdit(banner)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("edit")}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(banner)}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("delete")}
              </button>
            </div>
          );
        },
      },
    ],
    [formatSchedule, placementLabel, t]
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadBanners()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
          {!showForm ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a2847]"
            >
              <Plus className="h-4 w-4" />
              {t("newBanner")}
            </button>
          ) : null}
        </div>
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900">
              {editingId ? t("editTitle") : t("createTitle")}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <X className="h-3.5 w-3.5" />
              {t("cancel")}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-neutral-700">
                {t("form.title")} *
              </label>
              <input
                className={INPUT}
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                placeholder={t("form.titlePlaceholder")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-neutral-700">
                {t("form.subtitle")}
              </label>
              <input
                className={INPUT}
                value={form.subtitle}
                onChange={(e) => setForm((c) => ({ ...c, subtitle: e.target.value }))}
                placeholder={t("form.subtitlePlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">
                {t("form.placement")} *
              </label>
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
                    {placementLabel(placement)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">
                {t("form.sortOrder")}
              </label>
              <input
                type="number"
                min="0"
                className={INPUT}
                value={form.sortOrder}
                onChange={(e) => setForm((c) => ({ ...c, sortOrder: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">
                {t("form.link")} *
              </label>
              <input
                className={INPUT}
                value={form.href}
                onChange={(e) => setForm((c) => ({ ...c, href: e.target.value }))}
                placeholder={t("form.linkPlaceholder")}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">
                {t("form.cta")}
              </label>
              <input
                className={INPUT}
                value={form.ctaLabel}
                onChange={(e) => setForm((c) => ({ ...c, ctaLabel: e.target.value }))}
                placeholder={t("form.defaultCta")}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">
                {t("form.displayFrom")}
              </label>
              <input
                type="datetime-local"
                className={INPUT}
                value={form.startsAt}
                onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">
                {t("form.displayUntil")}
              </label>
              <input
                type="datetime-local"
                className={INPUT}
                value={form.expiresAt}
                onChange={(e) => setForm((c) => ({ ...c, expiresAt: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <span className="text-sm font-medium text-neutral-700">
                {t("form.image")} *
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => imageFileRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {t("form.uploadImage")}
                </button>
                <input
                  ref={imageFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                    e.target.value = "";
                  }}
                />
                {form.imageUrl ? (
                  <div className="h-16 w-[200px] shrink-0 overflow-hidden rounded-lg border bg-neutral-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.imageUrl}
                      alt={t("form.imagePreviewAlt")}
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
              <span className="text-sm font-medium text-neutral-700">{t("form.isActive")}</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0f3460] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a2847] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      ) : null}

      {!showForm ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : (
            <DataTable
              embedded
              data={banners}
              columns={columns}
              getRowId={(row) => row.id}
              emptyMessage={t("empty")}
              initialPageSize={10}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-banner-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h2
              id="delete-banner-title"
              className="text-lg font-semibold text-neutral-900"
            >
              {t("deleteModal.title")}
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              {t("deleteModal.body", { title: deleteTarget.title })}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {deleting ? t("deleteModal.deleting") : t("deleteModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
