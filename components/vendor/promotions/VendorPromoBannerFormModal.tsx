"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { VendorPortalOverlay } from "@/components/vendor/VendorPortalOverlay";

export type VendorCouponOption = {
  id: string;
  code: string;
  isActive: boolean;
};

export type BannerFormState = {
  title: string;
  subtitle: string;
  imageUrl: string;
  couponId: string;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  expiresAt: string;
};

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type VendorPromoBannerFormModalProps = {
  open: boolean;
  isEdit: boolean;
  form: BannerFormState;
  coupons: VendorCouponOption[];
  saving: boolean;
  uploading: boolean;
  onClose: () => void;
  onChange: (next: BannerFormState) => void;
  onSave: () => void;
  onUpload: (file: File) => void;
};

export function VendorPromoBannerFormModal({
  open,
  isEdit,
  form,
  coupons,
  saving,
  uploading,
  onClose,
  onChange,
  onSave,
  onUpload,
}: VendorPromoBannerFormModalProps) {
  const t = useTranslations("VendorPages.promotions");

  return (
    <VendorPortalOverlay open={open}>
      <div
        className="fixed inset-0 z-[100] flex min-h-[100dvh] w-screen items-center justify-center bg-black/50 p-3 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving && !uploading) onClose();
        }}
      >
        <div className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
            <h2 className="text-base font-semibold text-neutral-900">
              {isEdit ? t("editTitle") : t("createTitle")}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || uploading}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-60"
              aria-label={t("cancel")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-neutral-700 sm:col-span-2">
                {t("form.title")}
                <input
                  className={INPUT_CLASS}
                  value={form.title}
                  onChange={(event) =>
                    onChange({ ...form, title: event.target.value })
                  }
                  placeholder={t("form.titlePlaceholder")}
                  maxLength={120}
                />
              </label>

              <label className="block text-sm text-neutral-700 sm:col-span-2">
                {t("form.subtitle")}
                <input
                  className={INPUT_CLASS}
                  value={form.subtitle}
                  onChange={(event) =>
                    onChange({ ...form, subtitle: event.target.value })
                  }
                  placeholder={t("form.subtitlePlaceholder")}
                  maxLength={200}
                />
              </label>

              <div className="sm:col-span-2">
                <p className="text-sm text-neutral-700">{t("form.image")}</p>
                <p className="mt-1 text-xs text-neutral-500">{t("imageHint")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                    <ImagePlus className="h-4 w-4" />
                    {uploading ? t("form.uploading") : t("form.upload")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onUpload(file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt=""
                      className="h-16 w-32 rounded-lg border object-cover"
                    />
                  ) : null}
                </div>
              </div>

              <label className="block text-sm text-neutral-700">
                {t("form.coupon")}
                <select
                  className={INPUT_CLASS}
                  value={form.couponId}
                  onChange={(event) =>
                    onChange({ ...form, couponId: event.target.value })
                  }
                >
                  <option value="">{t("form.noCoupon")}</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.code}
                      {!coupon.isActive ? ` (${t("statuses.inactive")})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-neutral-700">
                {t("form.sortOrder")}
                <input
                  className={INPUT_CLASS}
                  type="number"
                  min="0"
                  max="100"
                  value={form.sortOrder}
                  onChange={(event) =>
                    onChange({ ...form, sortOrder: event.target.value })
                  }
                />
                <span className="mt-1 block text-xs text-neutral-500">
                  {t("form.sortHelp")}
                </span>
              </label>

              <label className="block text-sm text-neutral-700">
                {t("form.startsAt")}
                <input
                  className={INPUT_CLASS}
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) =>
                    onChange({ ...form, startsAt: event.target.value })
                  }
                />
              </label>

              <label className="block text-sm text-neutral-700">
                {t("form.expiresAt")}
                <input
                  className={INPUT_CLASS}
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) =>
                    onChange({ ...form, expiresAt: event.target.value })
                  }
                />
              </label>

              <label className="flex items-start gap-2 text-sm text-neutral-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    onChange({ ...form, isActive: event.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
                />
                <span>{t("form.isActive")}</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || uploading}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={saving || uploading}
              onClick={onSave}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? t("save") : t("create")}
            </button>
          </div>
        </div>
      </div>
    </VendorPortalOverlay>
  );
}
