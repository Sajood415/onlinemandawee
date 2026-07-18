"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProductTranslationFields } from "@/components/products/ProductTranslationFields";
import type { ProductTranslationFormFields } from "@/components/products/product-translation-form";
import { VendorPortalOverlay } from "@/components/vendor/VendorPortalOverlay";
import {
  CURRENCIES,
  INPUT,
  LABEL,
  type Category,
  type ImageSlot,
  type ProductFormState,
  type VariantFormRow,
  type VendorProduct,
} from "@/components/vendor/products/vendor-product-types";

type FormTab = "basics" | "pricing" | "photos" | "more";

const TABS: FormTab[] = ["basics", "pricing", "photos", "more"];

type VendorProductFormModalProps = {
  open: boolean;
  isEdit: boolean;
  editingProduct: VendorProduct | null;
  form: ProductFormState;
  categories: Category[];
  variantRows: VariantFormRow[];
  variantsLoading: boolean;
  variantsError: string | null;
  saving: boolean;
  showBasePricingFields: boolean;
  onCloseRequest: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFieldChange: <K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K]
  ) => void;
  onTranslationChange: <K extends keyof ProductTranslationFormFields>(
    key: K,
    value: ProductTranslationFormFields[K]
  ) => void;
  onAddVariant: () => void;
  onUpdateVariant: (localId: string, patch: Partial<VariantFormRow>) => void;
  onRemoveVariant: (row: VariantFormRow) => void;
  onRetryVariants: () => void;
  onAddImageSlot: () => void;
  onRemoveImageSlot: (index: number) => void;
  onUpdateUrlSlot: (index: number, url: string) => void;
  onFilePick: (files: FileList | null) => void;
};

export function VendorProductFormModal({
  open,
  isEdit,
  editingProduct,
  form,
  categories,
  variantRows,
  variantsLoading,
  variantsError,
  saving,
  showBasePricingFields,
  onCloseRequest,
  onSubmit,
  onFieldChange,
  onTranslationChange,
  onAddVariant,
  onUpdateVariant,
  onRemoveVariant,
  onRetryVariants,
  onAddImageSlot,
  onRemoveImageSlot,
  onUpdateUrlSlot,
  onFilePick,
}: VendorProductFormModalProps) {
  const t = useTranslations("VendorPages.products");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<FormTab>("basics");

  useEffect(() => {
    if (open) setTab("basics");
  }, [open]);

  const isLiveEdit = isEdit && editingProduct?.approvalStatus === "APPROVED";
  const isRejected = isEdit && editingProduct?.approvalStatus === "REJECTED";
  const tabIndex = TABS.indexOf(tab);
  const isLastTab = tabIndex === TABS.length - 1;

  const tabLabel = (id: FormTab) => {
    if (id === "basics") return t("form.tabBasics");
    if (id === "pricing") return t("form.tabPricing");
    if (id === "photos") return t("form.tabPhotos");
    return t("form.tabMore");
  };

  return (
    <VendorPortalOverlay open={open}>
    <div
      className="fixed inset-0 z-[100] flex min-h-[100dvh] w-screen items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRequest();
      }}
    >
      <div className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            {isEdit ? t("form.editTitle") : t("form.addTitle")}
          </h2>
          <button
            type="button"
            onClick={onCloseRequest}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
            aria-label={t("form.cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-neutral-100 px-2 sm:px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {TABS.map((id) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                  }`}
                >
                  {tabLabel(id)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <form id="product-form" onSubmit={onSubmit} className="space-y-5">
            {(isLiveEdit || isRejected) && tab === "basics" ? (
              <div className="space-y-3">
                {isLiveEdit ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {t("liveEditWarning")}
                  </div>
                ) : null}
                {isRejected && editingProduct?.rejectionReason ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <p className="font-semibold">{t("rejection.label")}</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {editingProduct.rejectionReason}
                    </p>
                    <p className="mt-2 text-red-700">{t("rejection.fixHint")}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "basics" ? (
              <section className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>
                      {t("form.name")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={INPUT}
                      value={form.name}
                      onChange={(e) => onFieldChange("name", e.target.value)}
                      maxLength={160}
                      placeholder={t("form.namePlaceholder")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>
                      {t("form.category")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={INPUT}
                      value={form.categoryId}
                      onChange={(e) =>
                        onFieldChange("categoryId", e.target.value)
                      }
                    >
                      <option value="">{t("form.selectCategory")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>
                    {t("form.description")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className={`${INPUT} resize-y`}
                    value={form.description}
                    onChange={(e) =>
                      onFieldChange("description", e.target.value)
                    }
                    maxLength={5000}
                    placeholder={t("form.descriptionPlaceholder")}
                  />
                  <p className="text-xs text-neutral-400">
                    {t("form.descriptionHint")}
                  </p>
                </div>

                {isEdit ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        onFieldChange("isActive", e.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-medium text-neutral-800">
                        {t("form.isActive")}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500">
                        {t("form.isActiveHelp")}
                      </span>
                    </span>
                  </label>
                ) : null}
              </section>
            ) : null}

            {tab === "pricing" ? (
              <section className="space-y-5">
                {!showBasePricingFields ? (
                  <p className="text-xs text-neutral-500">
                    {t("form.pricingHiddenHint")}
                  </p>
                ) : null}
                <div
                  className={`grid gap-4 ${
                    showBasePricingFields
                      ? "sm:grid-cols-2 lg:grid-cols-4"
                      : "sm:grid-cols-1"
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <label className={LABEL}>
                      {t("form.currency")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={INPUT}
                      value={form.currency}
                      onChange={(e) =>
                        onFieldChange("currency", e.target.value)
                      }
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
                        <label className={LABEL}>
                          {t("form.price")}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className={INPUT}
                          value={form.priceAmount}
                          onChange={(e) =>
                            onFieldChange("priceAmount", e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={LABEL}>
                          {t("form.stock")}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className={INPUT}
                          value={form.stockQty}
                          onChange={(e) =>
                            onFieldChange("stockQty", e.target.value)
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={LABEL}>{t("form.sku")}</label>
                        <input
                          className={INPUT}
                          value={form.sku}
                          onChange={(e) => onFieldChange("sku", e.target.value)}
                          maxLength={100}
                          placeholder={t("form.skuPlaceholder")}
                        />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">
                        {t("form.variantsTitle")}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {t("form.variantsSubtitle")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onAddVariant}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("form.addVariant")}
                    </button>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
                    {variantsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("form.variantsLoading")}
                      </div>
                    ) : variantsError ? (
                      <div>
                        <p className="mb-2 text-sm text-red-600">
                          {variantsError}
                        </p>
                        <button
                          type="button"
                          onClick={onRetryVariants}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          {t("actions.retry")}
                        </button>
                      </div>
                    ) : variantRows.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs text-neutral-500">
                          {t("form.variantsHelp")}
                        </p>
                        {variantRows.map((row) => (
                          <div
                            key={row.localId}
                            className="grid gap-2 rounded-xl border border-neutral-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1fr_5.5rem_4.5rem_5.5rem_auto_auto] lg:items-end"
                          >
                            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                                {t("form.variantName")} *
                              </label>
                              <input
                                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                value={row.name}
                                onChange={(e) =>
                                  onUpdateVariant(row.localId, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder={t("form.variantNamePlaceholder")}
                                maxLength={100}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                                {t("form.variantPrice")} *
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                value={row.priceAmount}
                                onChange={(e) =>
                                  onUpdateVariant(row.localId, {
                                    priceAmount: e.target.value,
                                  })
                                }
                                placeholder="0.00"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                                {t("form.variantStock")} *
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                value={row.stockQty}
                                onChange={(e) =>
                                  onUpdateVariant(row.localId, {
                                    stockQty: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                                {t("form.variantSku")}
                              </label>
                              <input
                                className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                value={row.sku}
                                onChange={(e) =>
                                  onUpdateVariant(row.localId, {
                                    sku: e.target.value,
                                  })
                                }
                                maxLength={100}
                              />
                            </div>
                            <label className="flex h-9 cursor-pointer items-center gap-2 text-xs text-neutral-600">
                              <input
                                type="checkbox"
                                checked={row.isActive}
                                onChange={(e) =>
                                  onUpdateVariant(row.localId, {
                                    isActive: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 accent-primary"
                              />
                              {t("form.variantActive")}
                            </label>
                            <button
                              type="button"
                              onClick={() => onRemoveVariant(row)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                              title={t("form.removeVariant")}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400">
                        {t("form.variantsEmpty")}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {tab === "photos" ? (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">
                      {t("form.images")}{" "}
                      <span className="text-red-500">*</span>
                      <span className="ms-1.5 font-normal text-neutral-400">
                        {t("form.imagesMax")}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => onFilePick(e.target.files)}
                    />
                    <button
                      type="button"
                      disabled={form.images.length >= 10}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {t("form.upload")}
                    </button>
                    <button
                      type="button"
                      disabled={form.images.length >= 10}
                      onClick={onAddImageSlot}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("form.addUrl")}
                    </button>
                  </div>
                </div>

                {form.images.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-sm text-neutral-400">
                    {t("form.imagesEmpty")}
                  </p>
                ) : null}

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {form.images.map((slot: ImageSlot, index) => (
                    <div
                      key={index}
                      className="group relative flex flex-col gap-1.5"
                    >
                      {slot.kind === "file" ? (
                        <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slot.preview}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          {slot.uploading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onRemoveImageSlot(index)}
                            className="absolute right-1 top-1 rounded-full bg-white p-1 shadow rtl:left-1 rtl:right-auto"
                          >
                            <X className="h-3.5 w-3.5 text-neutral-700" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative flex flex-col gap-1">
                          {slot.url ? (
                            <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={slot.url}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (
                                    e.currentTarget as HTMLImageElement
                                  ).style.display = "none";
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => onRemoveImageSlot(index)}
                                className="absolute right-1 top-1 rounded-full bg-white p-1 shadow rtl:left-1 rtl:right-auto"
                              >
                                <X className="h-3.5 w-3.5 text-neutral-700" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative flex aspect-square items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
                              <ImageIcon className="h-6 w-6 text-neutral-300" />
                              <button
                                type="button"
                                onClick={() => onRemoveImageSlot(index)}
                                className="absolute right-1 top-1 rounded-full bg-white p-1 shadow rtl:left-1 rtl:right-auto"
                              >
                                <X className="h-3.5 w-3.5 text-neutral-700" />
                              </button>
                            </div>
                          )}
                          <input
                            className="w-full rounded border border-neutral-200 px-2 py-1 text-[11px] text-neutral-600 outline-none focus:border-primary"
                            value={slot.url}
                            onChange={(e) =>
                              onUpdateUrlSlot(index, e.target.value)
                            }
                            placeholder="https://..."
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "more" ? (
              <section>
                <ProductTranslationFields
                  fields={form.translations}
                  onChange={onTranslationChange}
                  inputClassName={INPUT}
                  labelClassName={LABEL}
                  labels={{
                    title: t("translations.title"),
                    subtitle: t("translations.subtitle"),
                    namePs: t("translations.namePs"),
                    nameFa: t("translations.nameFa"),
                    descriptionPs: t("translations.descriptionPs"),
                    descriptionFa: t("translations.descriptionFa"),
                  }}
                />
              </section>
            ) : null}
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onCloseRequest}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {t("form.cancel")}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {tabIndex > 0 ? (
              <button
                type="button"
                onClick={() => setTab(TABS[tabIndex - 1])}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {t("form.back")}
              </button>
            ) : null}
            {!isLastTab ? (
              <button
                type="button"
                onClick={() => setTab(TABS[tabIndex + 1])}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {t("form.next")}
              </button>
            ) : null}
            <button
              type="submit"
              form="product-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving
                ? isEdit
                  ? t("form.saving")
                  : t("form.creating")
                : isEdit
                  ? t("form.save")
                  : t("form.create")}
            </button>
          </div>
        </div>
      </div>
    </div>
    </VendorPortalOverlay>
  );
}
