export const homeBannerPlacements = ["HERO", "SECTION", "DUO"] as const;

export type HomeBannerPlacement = (typeof homeBannerPlacements)[number];

/** English fallback labels. Admin UI prefers AdminPages.banners.placements.* */
export const HOME_BANNER_PLACEMENT_LABELS: Record<HomeBannerPlacement, string> = {
  HERO: "Top of home",
  SECTION: "Middle of home",
  DUO: "Two banners under categories",
};
