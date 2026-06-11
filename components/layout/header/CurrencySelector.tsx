"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { type SupportedCurrency } from "@/lib/currency/constants";
import {
  CURRENCY_LABELS,
  SUPPORTED_CURRENCIES,
  useCurrency,
} from "@/store/currency-context";

const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: { opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.15 } },
};

type CurrencySelectorProps = {
  isRtl: boolean;
  variant?: "default" | "dark";
};

export function CurrencySelector({ isRtl, variant = "default" }: CurrencySelectorProps) {
  const t = useTranslations("Auth.currencies");
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", click);
    return () => window.removeEventListener("mousedown", click);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
        className={`group inline-flex h-9 min-h-9 items-center gap-1 rounded-full border px-2 text-xs font-bold text-gray-900 shadow-sm transition-all cursor-pointer sm:gap-2 sm:px-2.5 sm:ps-2 sm:pe-3 ${
          variant === "dark"
            ? open
              ? "border-white bg-white shadow-md ring-2 ring-white/70"
              : "border-white bg-white hover:border-gray-100 hover:bg-gray-50"
            : open
              ? "border-primary/30 bg-white shadow-lg"
              : "border-gray-200 bg-white hover:bg-gray-50"
        }`}
      >
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-full border ${
            variant === "dark"
              ? "border-gray-200 bg-gray-50"
              : "border-gray-100 bg-gray-50"
          }`}
          aria-hidden
        >
          <span className="text-[10px] font-extrabold leading-none tracking-tight text-black">
            {currency}
          </span>
        </span>
        <span className="hidden min-w-0 truncate text-left text-[12px] font-extrabold leading-none tracking-tight text-black sm:block">
          {CURRENCY_LABELS[currency]}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.25}
          className={`shrink-0 text-black transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute mt-3 w-52 bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-100 z-[10000] overflow-hidden p-2 ${isRtl ? "left-0" : "right-0"}`}
          >
            <p className="px-5 py-3 text-[9px] font-black text-black uppercase tracking-[0.2em] mb-1">
              {t("select")}
            </p>
            {SUPPORTED_CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setCurrency(code as SupportedCurrency);
                  setOpen(false);
                }}
                className={`w-full px-5 py-3.5 rounded-xl text-sm font-bold flex items-center gap-4 transition-all cursor-pointer text-black ${isRtl ? "text-right" : "text-left"} ${currency === code ? "bg-primary/10" : "hover:bg-gray-50"}`}
              >
                <span className="text-xs font-black tracking-wide text-black/70 w-10">
                  {code}
                </span>
                {CURRENCY_LABELS[code as SupportedCurrency]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
