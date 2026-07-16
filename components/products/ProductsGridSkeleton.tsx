"use client";

import { useTranslations } from "next-intl";

export function ProductsGridSkeleton({ count = 8 }: { count?: number }) {
  const t = useTranslations("Common");

  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 xl:gap-5"
      aria-busy="true"
      aria-label={t("loading")}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_30px_rgba(15,52,96,0.05)]"
        >
          <div className="aspect-[4/5] animate-pulse bg-gradient-to-br from-neutral-100 to-neutral-50" />
          <div className="space-y-3 p-4">
            <div className="h-2.5 w-16 animate-pulse rounded-full bg-neutral-200" />
            <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-200" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-5 w-20 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
