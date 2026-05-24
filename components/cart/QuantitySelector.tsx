"use client";

import { Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";

type QuantitySelectorProps = {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
};

export function QuantitySelector({
  quantity,
  onDecrease,
  onIncrease,
  disabled = false,
}: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-neutral-50 p-1 shadow-sm">
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        aria-label="Decrease quantity"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-white hover:text-[#0f3460] disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <motion.span
        key={quantity}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-w-10 text-center text-sm font-bold tabular-nums text-[#0f3460]"
      >
        {quantity}
      </motion.span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        aria-label="Increase quantity"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 transition hover:bg-white hover:text-[#0f3460] disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
