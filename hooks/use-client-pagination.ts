"use client";

import { useEffect, useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE_OPTIONS } from "@/components/ui/pagination-footer";

type UseClientPaginationOptions = {
  initialPageSize?: number;
  pageSizeOptions?: readonly number[];
  resetKey?: string | number;
};

export function useClientPagination<T>(
  items: T[],
  {
    initialPageSize = 10,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
    resetKey,
  }: UseClientPaginationOptions = {}
) {
  const safeInitialPageSize = pageSizeOptions.includes(initialPageSize)
    ? initialPageSize
    : pageSizeOptions[0] ?? 10;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(safeInitialPageSize);

  useEffect(() => {
    setPageIndex(0);
  }, [resetKey, pageSize]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const safePageIndex = Math.min(pageIndex, pageCount - 1);

  useEffect(() => {
    if (pageIndex !== safePageIndex) {
      setPageIndex(safePageIndex);
    }
  }, [pageIndex, safePageIndex]);

  const paginatedItems = useMemo(() => {
    const start = safePageIndex * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePageIndex]);

  return {
    paginatedItems,
    pageIndex: safePageIndex,
    pageCount,
    pageSize,
    pageSizeOptions,
    setPageIndex,
    setPageSize,
    totalItems: items.length,
  };
}
