"use client";

import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";
import {
  fetchActiveHomeBanners,
  type PublicHomeBanner,
} from "@/lib/home/fetch-home-banners";

import { PROMO_BANNER_HEIGHT } from "./PromoBannerTile";

export function HomeDuoBanners() {
  const [banners, setBanners] = useState<PublicHomeBanner[]>([]);

  useEffect(() => {
    void fetchActiveHomeBanners()
      .then((items) => setBanners(items.filter((item) => item.placement === "DUO")))
      .catch(() => setBanners([]));
  }, []);

  if (banners.length === 0) return null;

  return (
    <section className="w-full min-w-0 pb-4">
      <div
        className="flex w-full gap-2 sm:gap-3"
        style={{
          height: PROMO_BANNER_HEIGHT,
          minHeight: PROMO_BANNER_HEIGHT,
          maxHeight: PROMO_BANNER_HEIGHT,
        }}
      >
        {banners.slice(0, 2).map((banner) => (
          <Link
            key={banner.id}
            href={banner.href}
            aria-label={banner.title}
            className="relative block h-full min-h-0 min-w-0 flex-1 basis-0 overflow-hidden rounded-2xl bg-neutral-100 outline-none ring-offset-2 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ec1b23]/40"
          >
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="block h-full w-full object-cover object-center"
              loading="lazy"
              decoding="async"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
