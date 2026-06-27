"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { useDashboardGuard } from "@/components/dashboard/use-dashboard-guard";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type VendorCoupon = {
  id: string;
  code: string;
  isActive: boolean;
};

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

type BannerFormState = {
  title: string;
  subtitle: string;
  imageUrl: string;
  couponId: string;
  isActive: boolean;
  sortOrder: string;
  expiresAt: string;
};

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function emptyForm(): BannerFormState {
  return {
    title: "",
    subtitle: "",
    imageUrl: "",
    couponId: "",
    isActive: true,
    sortOrder: "0",
    expiresAt: "",
  };
}

export default function VendorPromotionsPage() {
  const { isLoading: guardLoading } = useDashboardGuard("VENDOR");
  const [banners, setBanners] = useState<VendorPromoBanner[]>([]);
  const [coupons, setCoupons] = useState<VendorCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerFormState>(() => emptyForm());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bannerRes, couponRes] = await Promise.all([
        fetchWithAuth("/api/vendor/promo-banners"),
        fetchWithAuth("/api/vendor/coupons"),
      ]);
      const bannerData = await parseApiResponse<VendorPromoBanner[]>(bannerRes);
      const couponData = await parseApiResponse<VendorCoupon[]>(couponRes);
      setBanners(bannerData);
      setCoupons(couponData.filter((coupon) => coupon.isActive));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load promotions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (guardLoading) return;
    void loadData();
  }, [guardLoading, loadData]);

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
      toast.success("Banner image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

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
      expiresAt: banner.expiresAt ? banner.expiresAt.slice(0, 16) : "",
    });
    setShowForm(true);
  };

  const saveBanner = async () => {
    if (!form.title.trim() || !form.imageUrl) {
      toast.error("Title and banner image are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        imageUrl: form.imageUrl,
        couponId: form.couponId || null,
        isActive: form.isActive,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };

      const response = await fetchWithAuth(
        editingId ? `/api/vendor/promo-banners/${editingId}` : "/api/vendor/promo-banners",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const saved = await parseApiResponse<VendorPromoBanner>(response);
      setBanners((current) =>
        editingId ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current]
      );
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      toast.success(editingId ? "Banner updated" : "Banner created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save banner.");
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Delete this promotional banner?")) return;
    try {
      const response = await fetchWithAuth(`/api/vendor/promo-banners/${id}`, {
        method: "DELETE",
      });
      await parseApiResponse(response);
      setBanners((current) => current.filter((item) => item.id !== id));
      toast.success("Banner deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete banner.");
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3460]">Store promotions</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Banners appear at the top of your public store. Link a coupon so customers see the code
            (e.g. Eid Sale — code SAVE20).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New banner
        </button>
      </div>

      {showForm ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-900">
              {editingId ? "Edit banner" : "Create banner"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-neutral-700 sm:col-span-2">
              Headline
              <input
                className={INPUT_CLASS}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Eid Sale 20% Off"
                required
              />
            </label>
            <label className="block text-sm text-neutral-700 sm:col-span-2">
              Subtitle (optional)
              <input
                className={INPUT_CLASS}
                value={form.subtitle}
                onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
                placeholder="Use code SAVE20 at checkout"
              />
            </label>
            <label className="block text-sm text-neutral-700 sm:col-span-2">
              Banner image
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  <ImagePlus className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file);
                    }}
                  />
                </label>
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt="Banner preview"
                    className="h-16 w-32 rounded-lg border object-cover"
                  />
                ) : null}
              </div>
            </label>
            <label className="block text-sm text-neutral-700">
              Linked coupon (optional)
              <select
                className={INPUT_CLASS}
                value={form.couponId}
                onChange={(event) => setForm({ ...form, couponId: event.target.value })}
              >
                <option value="">No coupon</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-neutral-700">
              Sort order
              <input
                className={INPUT_CLASS}
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
              />
            </label>
            <label className="block text-sm text-neutral-700">
              Expires at (optional)
              <input
                className={INPUT_CLASS}
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
              />
              Active — visible on your store
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void saveBanner()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create banner"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : banners.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-neutral-600">
            No promotional banners yet. Create one to highlight sales on your storefront.
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="h-20 w-36 rounded-lg border object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0f3460]">{banner.title}</p>
                    {banner.subtitle ? (
                      <p className="mt-1 text-sm text-neutral-600">{banner.subtitle}</p>
                    ) : null}
                    {banner.couponCode ? (
                      <p className="mt-2 font-mono text-sm font-bold text-primary">
                        Code: {banner.couponCode}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-neutral-500">
                      {banner.isActive ? "Active" : "Inactive"}
                      {banner.expiresAt
                        ? ` · Expires ${new Date(banner.expiresAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(banner)}
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteBanner(banner.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
