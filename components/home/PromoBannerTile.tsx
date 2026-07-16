"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";

import type { PublicHomeBanner } from "@/lib/home/fetch-home-banners";

export const PROMO_BANNER_HEIGHT = "clamp(6.5rem, 18vw, 14rem)";
export const PROMO_BANNER_HEIGHT_CLASS = "promo-banner-height";

type PromoBannerTileProps = {
  banner: PublicHomeBanner;
  sizes: string;
};

export function PromoBannerTile({ banner, sizes }: PromoBannerTileProps) {
  return (
    <Link
      href={banner.href}
      aria-label={banner.title}
      className="relative block w-full min-w-0 overflow-hidden rounded-xl bg-neutral-100 outline-none ring-offset-2 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#ec1b23]/40 sm:rounded-2xl [height:var(--promo-banner-height-mobile)] sm:[height:var(--promo-banner-height)]"
    >
      <Image
        src={banner.imageUrl}
        alt={banner.title}
        width={1200}
        height={320}
        className="block h-full w-full object-cover object-center"
        sizes={sizes}
      />
    </Link>
  );
}
