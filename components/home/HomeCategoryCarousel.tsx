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
    <section className="mb-6 [font-family:var(--font-poppins)] text-[#000000] font-normal leading-[1.2]">
      <h2 className="m-0 mb-8 text-center text-lg uppercase tracking-wide sm:text-xl">
        {t("shopByCategory")}
      </h2>
      <div className="relative">
        <button
          type="button"
          onClick={() => scroll(-1)}
          className="absolute left-0 top-[72px] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 sm:top-[80px] sm:flex"
          aria-label="prev"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          className="absolute right-0 top-[72px] z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 sm:top-[80px] sm:flex"
          aria-label="next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2 pl-1 pr-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 sm:px-2 md:px-4 [&::-webkit-scrollbar]:hidden"
        >
          {tiles.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className="group flex w-[144px] shrink-0 flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-[160px]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  className="object-cover object-center transition duration-300 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 144px, 160px"
                />
              </div>
              <div className="w-full px-0.5 text-center">
                <h3 className="m-0 text-[11px] font-normal uppercase leading-[1.2] tracking-wide text-[#000000] sm:text-xs">
                  {item.label}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
