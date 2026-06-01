import { z } from "zod";

const reportRangeFields = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function validateReportRange(
  value: { from?: Date; to?: Date },
  ctx: z.RefinementCtx
) {
  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({
      code: "custom",
      path: ["to"],
      message: "to must be greater than or equal to from",
    });
  }
}

export const reportRangeQuerySchema = reportRangeFields.superRefine(validateReportRange);

export const salesSummaryQuerySchema = reportRangeFields
  .extend({
    granularity: z.enum(["day", "week", "month"]).default("day"),
  })
  .superRefine(validateReportRange);

export const membershipInvoiceGenerationSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});
