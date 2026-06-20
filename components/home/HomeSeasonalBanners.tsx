"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

import {
  fetchActiveHomeBanners,
  type PublicHomeBanner,
} from "@/lib/home/fetch-home-banners";

import { HomeBannerContentOverlay } from "./HomeBannerContentOverlay";

export function HomeSeasonalBanners() {
  const [banners, setBanners] = useState<PublicHomeBanner[]>([]);

  useEffect(() => {
    void fetchActiveHomeBanners()
      .then((items) => setBanners(items.filter((item) => item.placement === "SECTION")))
      .catch(() => setBanners([]));
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="w-full min-w-0 space-y-4 bg-white px-0 py-6 sm:px-4 sm:py-8 lg:px-6">
      {banners.map((banner) => (
        <Link
          key={banner.id}
          href={banner.href}
          className="relative block w-full min-w-0 overflow-hidden rounded-none bg-slate-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary sm:rounded-2xl sm:shadow-sm max-sm:min-h-0 sm:min-h-[120px] sm:h-[clamp(8.5rem,20vw,16.5rem)]"
        >
          <Image
            src={banner.imageUrl}
            alt={banner.title}
            width={2048}
            height={820}
            className="h-auto w-full object-contain object-center sm:absolute sm:inset-0 sm:h-full sm:w-full sm:object-cover sm:object-center"
            sizes="100vw"
          />
          <HomeBannerContentOverlay
            title={banner.title}
            subtitle={banner.subtitle}
            ctaLabel={banner.ctaLabel}
          />
        </Link>
      ))}
    </div>
  );
}
