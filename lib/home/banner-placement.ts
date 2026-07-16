import type { HomeBannerPlacement } from "@/domain/home/home-banner-placement";

export const DUO_BANNER_SORT_BASE = 100;

export function toStoredBannerPlacement(input: {
  placement?: HomeBannerPlacement;
  sortOrder?: number;
}): { placement: "HERO" | "SECTION"; sortOrder: number } {
  const sortOrder = input.sortOrder ?? 0;

  if (input.placement === "DUO") {
    return {
      placement: "SECTION",
      sortOrder: DUO_BANNER_SORT_BASE + sortOrder,
    };
  }

  if (input.placement === "SECTION") {
    return {
      placement: "SECTION",
      sortOrder: Math.min(sortOrder, DUO_BANNER_SORT_BASE - 1),
    };
  }

  return {
    placement: input.placement ?? "HERO",
    sortOrder,
  };
}

export function toPublicBannerPlacement(banner: {
  placement: string;
  sortOrder: number;
}): HomeBannerPlacement {
  if (banner.placement === "DUO") {
    return "DUO";
  }

  if (banner.placement === "SECTION" && banner.sortOrder >= DUO_BANNER_SORT_BASE) {
    return "DUO";
  }

  if (banner.placement === "SECTION") {
    return "SECTION";
  }

  return "HERO";
}

export function toPublicBannerSortOrder(banner: {
  placement: string;
  sortOrder: number;
}): number {
  if (banner.placement === "SECTION" && banner.sortOrder >= DUO_BANNER_SORT_BASE) {
    return banner.sortOrder - DUO_BANNER_SORT_BASE;
  }

  return banner.sortOrder;
}
