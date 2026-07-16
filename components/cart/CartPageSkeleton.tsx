"use client";

import { useTranslations } from "next-intl";

export function CartPageSkeleton() {
  const t = useTranslations("Common");

  return (
    <div className="animate-pulse" aria-busy="true" aria-label={t("loadingCart")}>
      <div className="mb-6 h-4 w-48 bg-neutral-100" />
      <div className="mb-8 flex justify-between border-b border-neutral-200 pb-5">
        <div className="h-8 w-40 bg-neutral-100" />
        <div className="h-4 w-16 bg-neutral-100" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="divide-y divide-neutral-200 border-b border-neutral-200">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex gap-4 py-6">
              <div className="h-[88px] w-[88px] shrink-0 bg-neutral-100" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-24 bg-neutral-100" />
                <div className="h-4 w-3/4 bg-neutral-100" />
                <div className="h-3 w-20 bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4 border-t border-neutral-900 pt-5">
          <div className="h-4 w-28 bg-neutral-100" />
          <div className="h-3 w-16 bg-neutral-100" />
          <div className="h-11 w-full bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
