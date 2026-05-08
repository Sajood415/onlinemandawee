"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StoreCategoryTile } from "./types";
import { useHorizontalScroll } from "./useHorizontalScroll";

export function HomeCategoryCarousel() {
  const t = useTranslations("Homepage.store");
  const tiles = t.raw("categoryTiles") as StoreCategoryTile[];
  const { ref, scroll } = useHorizontalScroll();

  return (
    <section className="mb-14">
      <h2 className="mb-8 text-center text-lg font-bold uppercase tracking-wide text-slate-900 sm:text-xl">
        {t("shopByCategory")}
      </h2>
      <div className="relative">
        <button
          type="button"
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 sm:flex"
          aria-label="prev"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 sm:flex"
          aria-label="next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div
          ref={ref}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-2 pl-1 pr-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 sm:px-2 md:px-4 [&::-webkit-scrollbar]:hidden"
        >
          {tiles.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className="group flex w-[140px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-[160px]"
            >
              <div
                className="relative flex aspect-square items-center justify-center p-3"
                style={{ backgroundColor: item.tint }}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={item.image}
                    alt={item.label}
                    fill
                    className="object-contain drop-shadow-sm transition duration-300 group-hover:scale-105"
                    sizes="160px"
                  />
                </div>
              </div>
              <span className="px-2 py-3 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-900 sm:text-[11px]">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
