"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { PaginationFooter } from "@/components/ui/pagination-footer";
import { VendorConfirmDialog } from "@/components/vendor/products/VendorConfirmDialog";
import {
  VendorPromoBannerFormModal,
  type BannerFormState,
  type VendorCouponOption,
} from "@/components/vendor/promotions/VendorPromoBannerFormModal";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";
import { Link } from "@/i18n/navigation";

type BannerLifecycle = "active" | "inactive" | "scheduled" | "expired";

type VendorPromoBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  couponId: string | null;
  couponCode: string | null;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  expiresAt: string | null;
};

const LIFECYCLE_FILTERS: Array<BannerLifecycle | ""> = [
  "",
  "active",
  "inactive",
  "scheduled",
  "expired",
];

function emptyForm(): BannerFormState {
  return {
    title: "",
    subtitle: "",
    imageUrl: "",
    couponId: "",
    isActive: true,
    sortOrder: "0",
    startsAt: "",
    expiresAt: "",
  };
}

function toLocalInput(iso: string | null) {
  return iso ? iso.slice(0, 16) : "";
}

function getBannerLifecycle(banner: VendorPromoBanner): BannerLifecycle {
  if (!banner.isActive) return "inactive";
  const now = Date.now();
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) {
    return "scheduled";
  }
  if (banner.expiresAt && new Date(banner.expiresAt).getTime() < now) {
    return "expired";
  }
  return "active";
}

function lifecycleBadgeClass(status: BannerLifecycle) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "scheduled") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }
  if (status === "expired") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  return "bg-neutral-100 text-neutral-600 ring-neutral-200";
}

export default function VendorPromotionsPage() {
  const t = useTranslations("VendorPages.promotions");
  const locale = useLocale();
  const { isLoading: guardLoading } = useDashboardGuard("VENDOR");

  const [banners, setBanners] = useState<VendorPromoBanner[]>([]);
  const [coupons, setCoupons] = useState<VendorCouponOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerFormState>(() => emptyForm());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<BannerLifecycle | "">("");
  const [toggleTarget, setToggleTarget] = useState<VendorPromoBanner | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<VendorPromoBanner | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bannerRes, couponRes] = await Promise.all([
        fetchWithAuth("/api/vendor/promo-banners"),
        fetchWithAuth("/api/vendor/coupons"),
      ]);
      const bannerData = await parseApiResponse<VendorPromoBanner[]>(bannerRes);
      const couponData = await parseApiResponse<VendorCouponOption[]>(couponRes);
      setBanners(bannerData);
      setCoupons(couponData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (guardLoading) return;
    void loadData();
  }, [guardLoading, loadData]);

  const filteredBanners = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return banners.filter((banner) => {
      const lifecycle = getBannerLifecycle(banner);
      const matchStatus = !statusFilter || lifecycle === statusFilter;
      const matchText =
        !q ||
        banner.title.toLowerCase().includes(q) ||
        (banner.subtitle ?? "").toLowerCase().includes(q) ||
        (banner.couponCode ?? "").toLowerCase().includes(q);
      return matchStatus && matchText;
    });
  }, [banners, searchText, statusFilter]);

  const heroBannerId = useMemo(() => {
    const activeLike = banners
      .filter((b) => b.isActive)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    return activeLike[0]?.id ?? null;
  }, [banners]);

  const {
    paginatedItems: paginatedBanners,
    pageIndex,
    pageCount,
    pageSize,
    pageSizeOptions,
    setPageIndex,
    setPageSize,
  } = useClientPagination(filteredBanners, { initialPageSize: 10 });

  useEffect(() => {
    setPageIndex(0);
  }, [searchText, statusFilter, setPageIndex]);

  const couponOptions = useMemo(() => {
    const options = [...coupons];
    if (form.couponId && !options.some((c) => c.id === form.couponId)) {
      const editing = banners.find((b) => b.id === editingId);
      if (editing?.couponId === form.couponId && editing.couponCode) {
        options.unshift({
          id: editing.couponId,
          code: editing.couponCode,
          isActive: false,
        });
      }
    }
    return options.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.code.localeCompare(b.code);
    });
  }, [coupons, form.couponId, banners, editingId]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (banner: VendorPromoBanner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      imageUrl: banner.imageUrl,
      couponId: banner.couponId ?? "",
      isActive: banner.isActive,
      sortOrder: String(banner.sortOrder),
      startsAt: toLocalInput(banner.startsAt),
      expiresAt: toLocalInput(banner.expiresAt),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetchWithAuth("/api/vendor/products/upload", {
        method: "POST",
        body,
      });
      const data = await parseApiResponse<{ url: string }>(res);
      setForm((current) => ({ ...current, imageUrl: data.url }));
      toast.success(t("toasts.uploaded"));
    } catch (error) {
      toast.error(
        t("toasts.uploadError"),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    const title = form.title.trim();
    if (title.length < 2) {
      toast.error(t("toasts.validationTitle"), t("toasts.titleShort"));
      return false;
    }
    if (title.length > 120) {
      toast.error(t("toasts.validationTitle"), t("toasts.titleLong"));
      return false;
    }
    if (form.subtitle.trim().length > 200) {
      toast.error(t("toasts.validationTitle"), t("toasts.subtitleLong"));
      return false;
    }
    if (!form.imageUrl) {
      toast.error(t("toasts.validationTitle"), t("toasts.imageRequired"));
      return false;
    }
    const sort = Number.parseInt(form.sortOrder, 10);
    if (!Number.isInteger(sort) || sort < 0 || sort > 100) {
      toast.error(t("toasts.validationTitle"), t("toasts.sortInvalid"));
      return false;
    }
    if (form.startsAt && form.expiresAt) {
      if (
        new Date(form.startsAt).getTime() >= new Date(form.expiresAt).getTime()
      ) {
        toast.error(t("toasts.validationTitle"), t("toasts.dateOrder"));
        return false;
      }
    }
    return true;
  };

  const saveBanner = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        imageUrl: form.imageUrl,
        couponId: form.couponId || null,
        isActive: form.isActive,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : null,
      };

      const response = await fetchWithAuth(
        editingId
          ? `/api/vendor/promo-banners/${editingId}`
          : "/api/vendor/promo-banners",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const saved = await parseApiResponse<VendorPromoBanner>(response);
      setBanners((current) =>
        editingId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current]
      );
      closeForm();
      setForm(emptyForm());
      toast.success(editingId ? t("toasts.updated") : t("toasts.created"));
    } catch (error) {
      toast.error(
        t("toasts.saveError"),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    const banner = toggleTarget;
    try {
      const response = await fetchWithAuth(
        `/api/vendor/promo-banners/${banner.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !banner.isActive }),
        }
      );
      const saved = await parseApiResponse<VendorPromoBanner>(response);
      setBanners((current) =>
        current.map((item) => (item.id === saved.id ? saved : item))
      );
      toast.success(
        saved.isActive ? t("toasts.activated") : t("toasts.deactivated")
      );
      setToggleTarget(null);
    } catch (error) {
      toast.error(
        t("toasts.updateError"),
        error instanceof Error ? error.message : undefined
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetchWithAuth(
        `/api/vendor/promo-banners/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      await parseApiResponse(response);
      setBanners((current) =>
        current.filter((item) => item.id !== deleteTarget.id)
      );
      if (editingId === deleteTarget.id) closeForm();
      toast.success(t("toasts.deleted"));
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        t("toasts.deleteError"),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setDeleting(false);
    }
  };

  if (guardLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">{t("subtitle")}</p>
          <Link
            href="/vendor/coupons"
            className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
          >
            {t("goToCoupons")}
          </Link>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {t("newBanner")}
        </button>
      </div>

      <VendorPromoBannerFormModal
        open={showForm}
        isEdit={Boolean(editingId)}
        form={form}
        coupons={couponOptions}
        saving={saving}
        uploading={uploading}
        onClose={closeForm}
        onChange={setForm}
        onSave={() => void saveBanner()}
        onUpload={(file) => void uploadImage(file)}
      />

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-neutral-100 px-4 py-4 sm:px-5">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 rtl:left-auto rtl:right-3" />
            <input
              className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 rtl:pl-3 rtl:pr-9"
              placeholder={t("searchPlaceholder")}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <select
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as BannerLifecycle | "")
            }
          >
            {LIFECYCLE_FILTERS.map((value) => (
              <option key={value || "all"} value={value}>
                {value ? t(`statuses.${value}`) : t("allStatuses")}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-neutral-600">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            {t("loading")}
          </div>
        ) : banners.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-neutral-900">{t("empty")}</p>
            <p className="mt-1 text-sm text-neutral-600">{t("emptyHint")}</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t("addFirst")}
            </button>
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-neutral-600">
            {t("emptyFiltered")}
          </div>
        ) : (
          <>
            <div className="divide-y divide-neutral-200">
              {paginatedBanners.map((banner) => {
                const lifecycle = getBannerLifecycle(banner);
                const isHero = banner.id === heroBannerId;
                return (
                  <div
                    key={banner.id}
                    className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.imageUrl}
                        alt=""
                        className="h-20 w-32 shrink-0 rounded-lg border object-cover sm:w-36"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-primary">
                            {banner.title}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${lifecycleBadgeClass(lifecycle)}`}
                          >
                            {t(`statuses.${lifecycle}`)}
                          </span>
                          {isHero ? (
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                              {t("heroBadge")}
                            </span>
                          ) : null}
                        </div>
                        {banner.subtitle ? (
                          <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                            {banner.subtitle}
                          </p>
                        ) : null}
                        {banner.couponCode ? (
                          <p className="mt-2 font-mono text-sm font-bold text-primary">
                            {t("codeLabel", { code: banner.couponCode })}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-neutral-500">
                          {t("sortLabel", { order: banner.sortOrder })}
                          {banner.startsAt
                            ? ` · ${t("starts", {
                                date: new Date(banner.startsAt).toLocaleString(
                                  locale
                                ),
                              })}`
                            : ""}
                          {banner.expiresAt
                            ? ` · ${t("expires", {
                                date: new Date(banner.expiresAt).toLocaleString(
                                  locale
                                ),
                              })}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => openEdit(banner)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <Pencil className="h-4 w-4" />
                        {t("edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setToggleTarget(banner)}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        {banner.isActive ? t("deactivate") : t("activate")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(banner)}
                        className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:col-span-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationFooter
              pageIndex={pageIndex}
              pageCount={pageCount}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageIndexChange={setPageIndex}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </section>

      <VendorConfirmDialog
        open={Boolean(toggleTarget)}
        title={
          toggleTarget?.isActive
            ? t("deactivateConfirm.title")
            : t("activateConfirm.title")
        }
        body={
          toggleTarget?.isActive
            ? t("deactivateConfirm.body")
            : t("activateConfirm.body")
        }
        confirmLabel={
          toggleTarget?.isActive
            ? t("deactivateConfirm.confirm")
            : t("activateConfirm.confirm")
        }
        cancelLabel={
          toggleTarget?.isActive
            ? t("deactivateConfirm.cancel")
            : t("activateConfirm.cancel")
        }
        danger={Boolean(toggleTarget?.isActive)}
        onConfirm={() => void confirmToggle()}
        onCancel={() => setToggleTarget(null)}
      />

      <VendorConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("deleteConfirm.title")}
        body={t("deleteConfirm.body")}
        confirmLabel={t("deleteConfirm.confirm")}
        cancelLabel={t("deleteConfirm.cancel")}
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
