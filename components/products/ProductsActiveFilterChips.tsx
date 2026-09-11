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
          className="inline-flex items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary/5 px-2.5 py-1 text-xs font-semibold text-secondary transition hover:bg-secondary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          aria-label={`${t("removeFilter")}: ${chip.label}`}
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="rounded text-xs font-semibold text-neutral-500 underline-offset-2 hover:text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
      >
        {t("clearAll")}
      </button>
    </div>
  );
}
