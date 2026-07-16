"use client";

import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";
import {
  fetchActiveHomeBanners,
  type PublicHomeBanner,
} from "@/lib/home/fetch-home-banners";

export function HomeDuoBanners() {
  const [banners, setBanners] = useState<PublicHomeBanner[]>([]);

  useEffect(() => {
    void fetchActiveHomeBanners()
      .then((items) => setBanners(items.filter((item) => item.placement === "DUO")))
      .catch(() => setBanners([]));
  }, []);

  if (banners.length === 0) return null;

  const duoItems = banners.slice(0, 2);

  return (
    <section className="w-full min-w-0 pb-4">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3 sm:[height:var(--promo-banner-height)] sm:[max-height:var(--promo-banner-height)] sm:[min-height:var(--promo-banner-height)]">
        {duoItems.map((banner) => (
          <Link
            key={banner.id}
            href={banner.href}
            aria-label={banner.title}
            className="relative block min-h-0 min-w-0 flex-1 basis-0 overflow-hidden rounded-xl bg-neutral-100 outline-none ring-offset-2 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ec1b23]/40 sm:h-full sm:rounded-2xl [height:var(--promo-banner-height-mobile)] sm:[height:unset]"
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
