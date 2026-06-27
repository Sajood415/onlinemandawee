"use client";

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type PaginationFooterProps = {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
};

export function PaginationFooter({
  pageIndex,
  pageCount,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageIndexChange,
  onPageSizeChange,
  className = "",
}: PaginationFooterProps) {
  const safePageCount = Math.max(pageCount, 1);
  const pageNumber = Math.min(pageIndex + 1, safePageCount);
  const canGoPrev = pageIndex > 0;
  const canGoNext = pageIndex + 1 < safePageCount;

  return (
    <div
      className={`flex flex-col gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="text-sm text-neutral-600">
        Page {pageNumber} of {safePageCount}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          aria-label="Rows per page"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPageIndexChange(pageIndex - 1)}
          disabled={!canGoPrev}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageIndexChange(pageIndex + 1)}
          disabled={!canGoNext}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
