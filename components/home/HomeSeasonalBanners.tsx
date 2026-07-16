"use client";

import { useEffect, useState } from "react";

import {
  fetchActiveHomeBanners,
  type PublicHomeBanner,
} from "@/lib/home/fetch-home-banners";

import { PromoBannerTile } from "./PromoBannerTile";

export function HomeSeasonalBanners() {
  const [banners, setBanners] = useState<PublicHomeBanner[]>([]);

  useEffect(() => {
    void fetchActiveHomeBanners()
      .then((items) => setBanners(items.filter((item) => item.placement === "SECTION")))
      .catch(() => setBanners([]));
  }, []);

  if (banners.length === 0) return null;

  return (
    <section className="w-full min-w-0 pb-4">
      <div className="grid grid-cols-4 items-stretch gap-2 sm:gap-3">
        {banners.map((banner) => (
          <PromoBannerTile key={banner.id} banner={banner} sizes="25vw" />
        ))}
      </div>
    </section>
  );
}
