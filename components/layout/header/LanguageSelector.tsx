"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";

const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.15 },
  },
  exit: { opacity: 0, y: 4, transition: { duration: 0.1 } },
};

type LanguageSelectorProps = {
  locale: string;
  languages: Array<{ code: string; label: string; flag: string }>;
  label: string;
  isRtl: boolean;
  variant?: "default" | "dark";
};

const localeShortCode: Record<string, string> = {
  en: "EN",
  ps: "PS",
  "fa-AF": "FA",
};

function getTriggerClass(open: boolean, variant: "default" | "dark") {
  if (variant === "dark") {
    return `inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-white transition-colors hover:bg-white/10 ${
      open ? "bg-white/10" : ""
    }`;
  }

  return `inline-flex h-7 items-center gap-1 rounded px-1.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-200/60 hover:text-gray-900 ${
    open ? "bg-gray-200/60 text-gray-900" : ""
  }`;
}

export function LanguageSelector({
  locale,
  languages,
  label,
  isRtl,
  variant = "default",
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find((l) => l.code === locale) || languages[0];
  const shortCode =
    localeShortCode[current.code] ?? current.code.slice(0, 2).toUpperCase();

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
        className={`${getTriggerClass(open, variant)} cursor-pointer`}
      >
        <span className="text-sm leading-none" aria-hidden>
          {current.flag}
        </span>
        <span>{shortCode}</span>
        <ChevronDown
          size={12}
          strokeWidth={2.5}
          className={`opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute z-[10000] mt-1.5 min-w-[10rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${isRtl ? "left-0" : "right-0"}`}
          >
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {label}
            </p>
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.replace(pathname, { locale: l.code });
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors ${isRtl ? "text-right" : "text-left"} ${
                  locale === l.code
                    ? "bg-gray-50 font-semibold text-gray-900"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
