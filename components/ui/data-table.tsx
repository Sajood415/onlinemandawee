"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  PaginationFooter,
} from "@/components/ui/pagination-footer";

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowId?: (row: TData, index: number) => string;
  emptyMessage?: string;
  pageSizeOptions?: readonly number[];
  initialPageSize?: number;
  onRowClick?: (row: TData) => void;
  /** Server-driven pagination — pass pageCount and control pagination state externally. */
  manualPagination?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  hidePagination?: boolean;
  /** Drop outer card chrome when nested inside another panel. */
  embedded?: boolean;
};

export function DataTable<TData>({
  data,
  columns,
  getRowId,
  emptyMessage = "No records found.",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  initialPageSize = 10,
  onRowClick,
  manualPagination = false,
  pageCount: manualPageCount,
  pagination: controlledPagination,
  onPaginationChange,
  hidePagination = false,
  embedded = false,
}: DataTableProps<TData>) {
  const safeInitialPageSize = useMemo(() => {
    if (pageSizeOptions.includes(initialPageSize)) return initialPageSize;
    return pageSizeOptions[0] ?? 10;
  }, [initialPageSize, pageSizeOptions]);

  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: safeInitialPageSize,
  });

  const pagination = controlledPagination ?? internalPagination;
  const setPagination = onPaginationChange ?? setInternalPagination;

  useEffect(() => {
    if (!manualPagination && !controlledPagination) {
      setInternalPagination((current) => ({
        ...current,
        pageIndex: 0,
      }));
    }
  }, [data.length, manualPagination, controlledPagination]);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { pagination },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      setPagination(next);
    },
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination
      ? { manualPagination: true, pageCount: manualPageCount ?? 1 }
      : { getPaginationRowModel: getPaginationRowModel() }),
  });

  const pageCount = manualPagination
    ? Math.max(manualPageCount ?? 1, 1)
    : Math.max(table.getPageCount(), 1);

  return (
    <div
      className={
        embedded
          ? "overflow-hidden"
          : "overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
      }
    >
      {!embedded ? (
        <p className="border-b border-neutral-100 px-4 py-2 text-xs text-neutral-500 sm:hidden">
          Swipe horizontally to see all columns
        </p>
      ) : null}
      <div className="responsive-table-shell">
        <table className="w-full min-w-[720px] border-collapse sm:min-w-[820px]">
          <thead className="bg-neutral-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-neutral-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-600"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={`border-b border-neutral-100 transition-colors hover:bg-neutral-50${
                    onRowClick ? " cursor-pointer" : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-top text-sm text-neutral-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-4 py-14 text-center text-sm text-neutral-500"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!hidePagination && (manualPagination ? pageCount > 0 : data.length > 0) ? (
        <PaginationFooter
          pageIndex={pagination.pageIndex}
          pageCount={pageCount}
          pageSize={pagination.pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageIndexChange={(nextPageIndex) =>
            setPagination({ ...pagination, pageIndex: nextPageIndex })
          }
          onPageSizeChange={(nextPageSize) =>
            setPagination({ pageIndex: 0, pageSize: nextPageSize })
          }
        />
      ) : null}
    </div>
  );
}
