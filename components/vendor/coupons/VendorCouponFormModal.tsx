"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { VendorPortalOverlay } from "@/components/vendor/VendorPortalOverlay";

export type CouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type VendorProductOption = {
  id: string;
  name: string;
};

export type CouponFormState = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  isActive: boolean;
  appliesToAllProducts: boolean;
  productIds: string[];
  startsAt: string;
  expiresAt: string;
  maxUses: string;
  minOrderAmount: string;
};

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type VendorCouponFormModalProps = {
  open: boolean;
  isEdit: boolean;
  form: CouponFormState;
  currency: string;
  saving: boolean;
  vendorProducts: VendorProductOption[];
  onClose: () => void;
  onChange: (next: CouponFormState) => void;
  onSave: () => void;
};

export function VendorCouponFormModal({
  open,
  isEdit,
  form,
  currency,
  saving,
  vendorProducts,
  onClose,
  onChange,
  onSave,
}: VendorCouponFormModalProps) {
  const t = useTranslations("VendorPages.coupons");
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (open) setProductSearch("");
  }, [open]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return vendorProducts;
    return vendorProducts.filter((product) =>
      product.name.toLowerCase().includes(q)
    );
  }, [vendorProducts, productSearch]);

  const toggleProduct = (productId: string) => {
    const next = form.productIds.includes(productId)
      ? form.productIds.filter((id) => id !== productId)
      : [...form.productIds, productId];
    onChange({ ...form, productIds: next });
  };

  return (
    <VendorPortalOverlay open={open}>
    <div
      className="fixed inset-0 z-[100] flex min-h-[100dvh] w-screen items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
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
            disabled={saving}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-60"
            aria-label={t("cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-neutral-700 sm:col-span-2">
              {t("form.code")}
              <input
                className={INPUT_CLASS}
                value={form.code}
                onChange={(event) =>
                  onChange({
                    ...form,
                    code: event.target.value.toUpperCase(),
                  })
                }
                placeholder={t("form.codePlaceholder")}
                maxLength={32}
              />
              <span className="mt-1 block text-xs text-neutral-500">
                {t("codeHint")}
              </span>
              {isEdit ? (
                <span className="mt-1 block text-xs text-amber-700">
                  {t("form.codeChangeWarning")}
                </span>
              ) : null}
            </label>

            <label className="block text-sm text-neutral-700">
              {t("form.discountType")}
              <select
                className={INPUT_CLASS}
                value={form.discountType}
                onChange={(event) =>
                  onChange({
                    ...form,
                    discountType: event.target.value as CouponDiscountType,
                  })
                }
              >
                <option value="PERCENTAGE">{t("form.percentage")}</option>
                <option value="FIXED_AMOUNT">
                  {t("form.fixed", { currency })}
                </option>
              </select>
            </label>

            <label className="block text-sm text-neutral-700">
              {form.discountType === "PERCENTAGE"
                ? t("form.discountPercent")
                : t("form.discountAmount", { currency })}
              <input
                className={INPUT_CLASS}
                type="number"
                min="1"
                max={form.discountType === "PERCENTAGE" ? "100" : undefined}
                step={form.discountType === "PERCENTAGE" ? "1" : "0.01"}
                value={form.discountValue}
                onChange={(event) =>
                  onChange({ ...form, discountValue: event.target.value })
                }
              />
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

            <label className="block text-sm text-neutral-700 sm:col-span-2">
              {t("form.maxUses")}
              <input
                className={INPUT_CLASS}
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(event) =>
                  onChange({ ...form, maxUses: event.target.value })
                }
                placeholder={t("form.maxUsesPlaceholder")}
              />
            </label>

            <div className="space-y-3 sm:col-span-2">
              <p className="text-sm font-medium text-neutral-700">
                {t("form.appliesTo")}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-neutral-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="couponScope"
                    checked={form.appliesToAllProducts}
                    onChange={() =>
                      onChange({
                        ...form,
                        appliesToAllProducts: true,
                        productIds: [],
                      })
                    }
                  />
                  {t("form.allProducts")}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="couponScope"
                    checked={!form.appliesToAllProducts}
                    onChange={() =>
                      onChange({ ...form, appliesToAllProducts: false })
                    }
                  />
                  {t("form.selectedProducts")}
                </label>
              </div>

              {!form.appliesToAllProducts ? (
                <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 rtl:left-auto rtl:right-3" />
                    <input
                      className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 rtl:pl-3 rtl:pr-9"
                      placeholder={t("productSearch")}
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {vendorProducts.length === 0 ? (
                      <p className="text-sm text-neutral-500">{t("noProducts")}</p>
                    ) : filteredProducts.length === 0 ? (
                      <p className="text-sm text-neutral-500">
                        {t("noProductMatches")}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {filteredProducts.map((product) => (
                          <li key={product.id}>
                            <label className="flex items-center gap-2 text-sm text-neutral-800">
                              <input
                                type="checkbox"
                                checked={form.productIds.includes(product.id)}
                                onChange={() => toggleProduct(product.id)}
                                className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary/30"
                              />
                              <span className="truncate">{product.name}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <label className="block text-sm text-neutral-700 sm:col-span-2">
              {t("form.minOrder", { currency })}
              <input
                className={INPUT_CLASS}
                type="number"
                min="0"
                step="0.01"
                value={form.minOrderAmount}
                onChange={(event) =>
                  onChange({ ...form, minOrderAmount: event.target.value })
                }
                placeholder={t("form.minOrderPlaceholder")}
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
            disabled={saving}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={saving}
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
