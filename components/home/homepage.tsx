"use client";

import { useLocale } from "next-intl";
import { HomeHeroCarousel } from "./HomeHeroCarousel";
import { HomeShopTypeCarousel } from "./HomeShopTypeCarousel";
import { HomeDuoBanners } from "./HomeDuoBanners";
import { HomeSeasonalBanners } from "./HomeSeasonalBanners";
import { HomeCouponDealsRail } from "./HomeCouponDealsRail";
import { HomeStackedSections } from "./HomeStackedSections";
import { HomeFeaturedBanner } from "./HomeFeaturedBanner";
import { HomeLatestProductsRail } from "./HomeLatestProductsRail";

export function HomePage() {
  const locale = useLocale();
  const isRtl = locale === "ps" || locale === "fa-AF";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-0 w-full min-w-0 bg-[#F3F5F8]">
      <div className="bg-white">
        <HomeHeroCarousel />
      </div>

      <div className="home-content-padding mx-auto w-full min-w-0 max-w-[1540px] space-y-4 py-4 sm:space-y-6 sm:py-6 lg:py-8">
        <div className="rounded-2xl bg-white px-3 py-4 shadow-sm sm:rounded-3xl sm:px-5 sm:py-6 lg:px-6">
          <HomeShopTypeCarousel />
        </div>

        <HomeFeaturedBanner />

        <div className="rounded-2xl bg-white px-3 py-4 shadow-sm sm:rounded-3xl sm:px-5 sm:py-6 lg:px-6">
          <HomeLatestProductsRail />
        </div>

        <HomeCouponDealsRail />
        <HomeSeasonalBanners />
        <HomeDuoBanners />
      </div>

      <HomeStackedSections />
    </div>
  );
}
