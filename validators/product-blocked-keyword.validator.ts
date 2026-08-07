import { z } from "zod";

export const createProductBlockedKeywordSchema = z.object({
  word: z
    .string()
    .trim()
    .min(2, "Keyword must be at least 2 characters")
    .max(80, "Keyword must be at most 80 characters"),
});

export const productBlockedKeywordIdParamsSchema = z.object({
  id: z.string().min(1),
});
