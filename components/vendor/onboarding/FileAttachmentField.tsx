"use client";

import { useId, useRef } from "react";

type FileAttachmentFieldProps = {
  label: string;
  /** Shows a red asterisk after the label for required uploads */
  required?: boolean;
  accept: string;
  hint: string;
  disabled: boolean;
  attachedFileName: string | null;
  savedText: string;
  hasSavedFile: boolean;
  onSelect: (file: File) => void;
};

export function FileAttachmentField({
  label,
  required = false,
  accept,
  hint,
  disabled,
  attachedFileName,
  savedText,
  hasSavedFile,
  onSelect,
}: FileAttachmentFieldProps) {
  const reactId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = `${reactId}-label`;

  const statusText = attachedFileName
    ? attachedFileName
    : hasSavedFile
      ? savedText
      : "No file chosen";

  const pickAriaLabel = `Choose file for ${label.replace(/\s*\(.*?\)\s*/g, "").trim()}`;

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3">
      <span id={labelId} className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
        {label}
        {required ? (
          <>
            {" "}
            <abbr className="font-semibold text-red-600 no-underline" title="Required" aria-label="required">
              *
            </abbr>
          </>
        ) : null}
      </span>

      <div
        role="group"
        aria-labelledby={labelId}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-neutral-300 bg-white px-3 py-2 shadow-sm outline-none transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choose file
        </button>
        <span
          className="min-w-0 flex-1 truncate text-sm text-neutral-700"
          title={attachedFileName ?? (hasSavedFile ? savedText : undefined)}
          aria-live="polite"
        >
          {statusText}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-label={pickAriaLabel}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            onSelect(file);
          }}
        />
      </div>

      <p className="text-xs leading-relaxed text-neutral-500">{hint}</p>
    </div>
  );
}
