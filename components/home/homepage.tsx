"use client";

import { useLocale } from "next-intl";
import { HomeHeroCarousel } from "./HomeHeroCarousel";
import { HomeCategoryCarousel } from "./HomeCategoryCarousel";
import { HomeDuoBanners } from "./HomeDuoBanners";
import { HomeSeasonalBanners } from "./HomeSeasonalBanners";
import { HomeCouponDealsRail } from "./HomeCouponDealsRail";
import { HomeCategoryShowcaseGrid } from "./HomeCategoryShowcaseGrid";
import { HomeStackedSections } from "./HomeStackedSections";

export function HomePage() {
  const locale = useLocale();
  const isRtl = locale === "ps" || locale === "fa-AF";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-0 w-full min-w-0 bg-white">
      <HomeHeroCarousel />
      <div className="w-full min-w-0 bg-white px-3 py-6 sm:px-4 sm:py-8">
        <HomeCouponDealsRail />
        <HomeSeasonalBanners />
        <HomeCategoryCarousel />
        <HomeDuoBanners />
        <HomeCategoryShowcaseGrid />
      </div>
      <HomeStackedSections />
    </div>
  );
}
