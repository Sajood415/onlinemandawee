"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type HomeSectionHeaderProps = {
  title: string;
  subtitle?: string;
  count?: number;
  badgeIcon?: ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  isRtl?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
};

export function HomeSectionHeader({
  title,
  subtitle,
  count,
  badgeIcon,
  viewAllHref,
  viewAllLabel,
  isRtl = false,
  onPrev,
  onNext,
  prevLabel = "Previous",
  nextLabel = "Next",
}: HomeSectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight text-[#0F3460] sm:text-xl lg:text-2xl">
            {title}
          </h2>
          {typeof count === "number" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ec1b23]/10 px-2 py-0.5 text-xs font-bold text-[#ec1b23]">
              {badgeIcon}
              {count}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onPrev && onNext ? (
          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={onPrev}
              aria-label={prevLabel}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-800"
            >
              {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label={nextLabel}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-800"
            >
              {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        ) : null}
        {viewAllHref && viewAllLabel ? (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3460] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0a2540] sm:text-sm"
          >
            {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : null}
            <span>{viewAllLabel}</span>
            {!isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : null}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
