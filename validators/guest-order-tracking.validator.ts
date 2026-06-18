import { z } from "zod";

export const guestOrderLookupSchema = z.object({
  orderNumber: z.string().trim().min(1),
  guestEmail: z.string().trim().email(),
});

export const guestOrderTrackingTokenParamsSchema = z.object({
  token: z.string().trim().min(16).max(128),
});
