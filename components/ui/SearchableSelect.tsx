"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type SearchableSelectProps = {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  emptyMessage?: string;
  onBlur?: () => void;
  variant?: "default" | "underline";
};

export function SearchableSelect({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  error,
  disabled,
  allowCustom = false,
  emptyMessage = "No matches found",
  onBlur,
  variant = "default",
}: SearchableSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((option) => option.value === value);
  const isUnderline = variant === "underline";

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query) ||
        option.hint?.toLowerCase().includes(query)
    );
  }, [options, search]);

  const showCustomOption =
    allowCustom &&
    search.trim().length > 0 &&
    !filteredOptions.some(
      (option) => option.value.toLowerCase() === search.trim().toLowerCase()
    );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onBlur]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const selectValue = (next: string) => {
    onChange(next);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <label
        className={
          isUnderline
            ? "mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500"
            : "mb-1.5 block text-sm font-medium text-gray-700"
        }
      >
        {label}
        {required ? <span className="ms-0.5 text-red-500">*</span> : null}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={
          isUnderline
            ? `flex w-full items-center justify-between gap-2 border-0 border-b bg-transparent px-0 py-2.5 text-left text-sm outline-none transition disabled:text-neutral-400 ${
                error
                  ? "border-red-400 focus:border-red-500"
                  : "border-neutral-300 focus:border-[#0F3460]"
              }`
            : `flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm outline-none transition disabled:bg-gray-50 disabled:text-gray-400 ${
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  : "border-gray-200 focus:border-[#0f3460] focus:ring-2 focus:ring-[#0f3460]/10"
              }`
        }
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={
            selectedOption || value
              ? isUnderline
                ? "text-neutral-900"
                : "text-gray-900"
              : isUnderline
                ? "text-neutral-400"
                : "text-gray-400"
          }
        >
          {selectedOption?.label ?? (value || placeholder)}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="absolute z-50 mt-2 w-full overflow-hidden border border-neutral-200 bg-white shadow-[0_20px_50px_rgba(15,52,96,0.15)]"
          role="listbox"
        >
          <div className="border-b border-neutral-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full border border-neutral-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0F3460] [&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:hidden"
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {showCustomOption ? (
              <li>
                <button
                  type="button"
                  onClick={() => selectValue(search.trim())}
                  className="flex w-full px-3 py-2.5 text-left text-sm text-[#0F3460] hover:bg-[#0F3460]/5"
                >
                  Use &ldquo;{search.trim()}&rdquo;
                </button>
              </li>
            ) : null}
            {filteredOptions.length === 0 && !showCustomOption ? (
              <li className="px-3 py-3 text-sm text-neutral-500">{emptyMessage}</li>
            ) : (
              filteredOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => selectValue(option.value)}
                    className={`flex w-full flex-col px-3 py-2.5 text-left text-sm transition hover:bg-[#0F3460]/5 ${
                      option.value === value
                        ? "bg-[#0F3460]/8 font-semibold text-[#0F3460]"
                        : "text-neutral-800"
                    }`}
                  >
                    <span>{option.label}</span>
                    {option.hint ? (
                      <span className="text-xs text-neutral-500">{option.hint}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-1.5 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
