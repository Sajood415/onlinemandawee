"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

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

  return (
    <section className="w-full min-w-0 pb-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {banners.slice(0, 2).map((banner) => (
          <Link
            key={banner.id}
            href={banner.href}
            aria-label={banner.title}
            className="relative block h-[clamp(6.5rem,18vw,14rem)] overflow-hidden rounded-2xl bg-neutral-100 outline-none ring-offset-2 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ec1b23]/40"
          >
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              fill
              className="object-cover object-center"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
