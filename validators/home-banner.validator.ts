import { z } from "zod";

import { homeBannerPlacements } from "@/domain/home/home-banner-placement";

const bannerFieldsSchema = z.object({
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(200).nullable().optional(),
  placement: z.enum(homeBannerPlacements).optional(),
  imageUrl: z.string().url(),
  imageMobileUrl: z.string().url().nullable().optional(),
  href: z.string().trim().min(1).max(500),
  ctaLabel: z.string().trim().max(80).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

function validateDateRange(value: {
  startsAt?: string | null;
  expiresAt?: string | null;
}) {
  if (value.startsAt && value.expiresAt) {
    return new Date(value.expiresAt) > new Date(value.startsAt);
  }
  return true;
}

export const createHomeBannerSchema = bannerFieldsSchema.refine(validateDateRange, {
  message: "End date must be after start date",
  path: ["expiresAt"],
});

export const updateHomeBannerSchema = bannerFieldsSchema.partial().refine(validateDateRange, {
  message: "End date must be after start date",
  path: ["expiresAt"],
});

export const homeBannerIdParamsSchema = z.object({
  id: z.string().min(1),
});
