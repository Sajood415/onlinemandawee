"use client";

import type { ProductTranslationFormFields } from "@/components/products/product-translation-form";

const INPUT =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const LABEL = "block text-sm font-medium text-neutral-700";

export type ProductTranslationFieldLabels = {
  title?: string;
  subtitle?: string;
  namePs?: string;
  nameFa?: string;
  descriptionPs?: string;
  descriptionFa?: string;
};

type ProductTranslationFieldsProps = {
  fields: ProductTranslationFormFields;
  onChange: <K extends keyof ProductTranslationFormFields>(
    key: K,
    value: ProductTranslationFormFields[K]
  ) => void;
  inputClassName?: string;
  labelClassName?: string;
  labels?: ProductTranslationFieldLabels;
};

export function ProductTranslationFields({
  fields,
  onChange,
  inputClassName = INPUT,
  labelClassName = LABEL,
  labels,
}: ProductTranslationFieldsProps) {
  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-neutral-800">
          {labels?.title ?? "Translations (optional)"}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {labels?.subtitle ??
            "Add Pashto or Dari names and descriptions. English is the default storefront fallback."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>
            {labels?.namePs ?? "Product name (Pashto)"}
          </label>
          <input
            className={inputClassName}
            value={fields.namePs}
            onChange={(e) => onChange("namePs", e.target.value)}
            maxLength={160}
            placeholder="په پښتو کې د محصول نوم"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>
            {labels?.nameFa ?? "Product name (Dari)"}
          </label>
          <input
            className={inputClassName}
            value={fields.nameFa}
            onChange={(e) => onChange("nameFa", e.target.value)}
            maxLength={160}
            placeholder="نام محصول به دری"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>
            {labels?.descriptionPs ?? "Description (Pashto)"}
          </label>
          <textarea
            rows={3}
            className={`${inputClassName} resize-y`}
            value={fields.descriptionPs}
            onChange={(e) => onChange("descriptionPs", e.target.value)}
            maxLength={5000}
            placeholder="په پښتو کې تشریح"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>
            {labels?.descriptionFa ?? "Description (Dari)"}
          </label>
          <textarea
            rows={3}
            className={`${inputClassName} resize-y`}
            value={fields.descriptionFa}
            onChange={(e) => onChange("descriptionFa", e.target.value)}
            maxLength={5000}
            placeholder="توضیحات به دری"
          />
        </div>
      </div>
    </div>
  );
}
