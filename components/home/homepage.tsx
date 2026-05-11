"use client";

import { useLocale } from "next-intl";
import { HomeHeroCarousel } from "./HomeHeroCarousel";
import { HomeCategoryCarousel } from "./HomeCategoryCarousel";
import { HomeStackedSections } from "./HomeStackedSections";

export function HomePage() {
  const locale = useLocale();
  const isRtl = locale === "ps" || locale === "fa-AF";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-0 w-full min-w-0 bg-white">
      <HomeHeroCarousel />
      <div className="w-full min-w-0 px-0 pt-6 sm:px-4 sm:pt-8 lg:px-6 xl:px-8">
        <HomeCategoryCarousel />
      </div>
      <HomeStackedSections />
    </div>
  );
}
