export const homeBannerPlacements = ["HERO", "SECTION", "DUO"] as const;

export type HomeBannerPlacement = (typeof homeBannerPlacements)[number];

export const HOME_BANNER_PLACEMENT_LABELS: Record<HomeBannerPlacement, string> = {
  HERO: "Hero carousel (top)",
  SECTION: "Promotional section strip",
  DUO: "Twin banners (below categories)",
};
