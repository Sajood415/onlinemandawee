"use client";

import { useLocale } from "next-intl";
import { HomeHeroCarousel } from "./HomeHeroCarousel";
import { HomeCategoryCarousel } from "./HomeCategoryCarousel";
import { HomeMidPromoCarousel } from "./HomeMidPromoCarousel";
import { HomeStackedSections } from "./HomeStackedSections";

export function HomePage() {
  const locale = useLocale();
  const isRtl = locale === "ps" || locale === "fa-AF";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-0 w-full min-w-0 bg-white">
      <HomeHeroCarousel />
      {/* Edge-to-edge on small screens; no side padding wrapper */}
      <div className="w-full min-w-0 pt-3 sm:px-4 sm:pt-5 lg:px-5">
        <HomeMidPromoCarousel />
      </div>
      <div className="w-full min-w-0 px-3 pt-2 sm:px-4 sm:pt-4 lg:px-5">
        <HomeCategoryCarousel />
      </div>
      <HomeStackedSections />
    </div>
  );
}
