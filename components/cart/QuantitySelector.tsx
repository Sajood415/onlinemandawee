"use client";

import { Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";

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
  const buttonClass = compact
    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-700 transition hover:bg-white hover:text-[#0f3460] disabled:opacity-40"
    : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-white hover:text-[#0f3460] disabled:opacity-40";
  const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      className={`inline-flex max-w-full items-center rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm ${
        compact ? "p-0.5" : "p-1"
      }${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        aria-label="Decrease quantity"
        className={buttonClass}
      >
        <Minus className={iconClass} />
      </button>
      <motion.span
        key={quantity}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`shrink-0 text-center font-bold tabular-nums text-[#0f3460] ${
          compact ? "min-w-7 text-xs" : "min-w-10 text-sm"
        }`}
      >
        {quantity}
      </motion.span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        aria-label="Increase quantity"
        className={buttonClass}
      >
        <Plus className={iconClass} />
      </button>
    </div>
  );
}
