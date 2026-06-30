"use client";

import type { CategoryTranslationFormFields } from "@/components/categories/category-translation-form";

const INPUT =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const LABEL = "block text-sm font-medium text-neutral-700";

type CategoryTranslationFieldsProps = {
  fields: CategoryTranslationFormFields;
  onChange: <K extends keyof CategoryTranslationFormFields>(
    key: K,
    value: CategoryTranslationFormFields[K]
  ) => void;
  inputClassName?: string;
  labelClassName?: string;
};

export function CategoryTranslationFields({
  fields,
  onChange,
  inputClassName = INPUT,
  labelClassName = LABEL,
}: CategoryTranslationFieldsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-neutral-800">Translations (optional)</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          Localized names for Pashto and Dari storefronts. English uses the main name above.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Name (Pashto)</label>
          <input
            className={inputClassName}
            value={fields.namePs}
            onChange={(e) => onChange("namePs", e.target.value)}
            maxLength={120}
            placeholder="په پښتو کې نوم"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Name (Dari)</label>
          <input
            className={inputClassName}
            value={fields.nameFa}
            onChange={(e) => onChange("nameFa", e.target.value)}
            maxLength={120}
            placeholder="نام به دری"
          />
        </div>
      </div>
    </div>
  );
}
