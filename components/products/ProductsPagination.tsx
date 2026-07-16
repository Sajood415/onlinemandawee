"use client";

import { useTranslations } from "next-intl";

type ProductsPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function ProductsPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: ProductsPaginationProps) {
  const t = useTranslations("ProductsPages.catalog");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
      <p className="text-sm text-neutral-500">{t("pageOf", { page, total: pageCount })}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-[#0F3460]/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("previous")}
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-[#0F3460]/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
