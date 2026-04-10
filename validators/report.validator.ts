import { z } from "zod";

export const reportRangeQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "to must be greater than or equal to from",
      });
    }
  });

export const membershipInvoiceGenerationSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});
