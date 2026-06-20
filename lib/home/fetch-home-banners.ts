import type { HomeBannerPlacement } from "@/domain/home/home-banner-placement";

export type PublicHomeBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  placement: HomeBannerPlacement;
  imageUrl: string;
  imageMobileUrl: string | null;
  href: string;
  ctaLabel: string | null;
  sortOrder: number;
};

export async function fetchActiveHomeBanners(): Promise<PublicHomeBanner[]> {
  const response = await fetch("/api/home/banners", { cache: "no-store" });
  if (!response.ok) return [];

  const payload = (await response.json()) as { data?: PublicHomeBanner[] };
  return payload.data ?? [];
}
