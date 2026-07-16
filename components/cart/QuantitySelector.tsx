"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

type QuantitySelectorProps = {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export function QuantitySelector({
  quantity,
  onDecrease,
  onIncrease,
  disabled = false,
  compact = false,
  className,
}: QuantitySelectorProps) {
  const t = useTranslations("Cart.quantity");
  const size = compact ? "h-8" : "h-9";
  const btn = compact ? "h-8 w-8" : "h-9 w-9";
  const icon = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div
      className={`inline-flex items-center border border-neutral-300 ${size}${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        aria-label={t("decrease")}
        className={`flex ${btn} items-center justify-center text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-35`}
      >
        <Minus className={icon} />
      </button>
      <span
        className={`min-w-8 text-center text-sm font-semibold tabular-nums text-neutral-900 ${
          compact ? "min-w-7 text-xs" : ""
        }`}
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        aria-label={t("increase")}
        className={`flex ${btn} items-center justify-center text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-35`}
      >
        <Plus className={icon} />
      </button>
    </div>
  );
}
