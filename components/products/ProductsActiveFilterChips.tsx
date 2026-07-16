"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export type ActiveFilterChip = {
  id: string;
  label: string;
};

type ProductsActiveFilterChipsProps = {
  chips: ActiveFilterChip[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
};

export function ProductsActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
}: ProductsActiveFilterChipsProps) {
  const t = useTranslations("ProductsPages.catalog");

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onRemove(chip.id)}
          className="inline-flex items-center gap-1.5 border border-[#0F3460]/20 bg-[#0F3460]/5 px-2.5 py-1 text-xs font-semibold text-[#0F3460] transition hover:bg-[#0F3460]/10"
          aria-label={`${t("removeFilter")}: ${chip.label}`}
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-neutral-500 underline-offset-2 hover:text-[#0F3460] hover:underline"
      >
        {t("clearAll")}
      </button>
    </div>
  );
}
