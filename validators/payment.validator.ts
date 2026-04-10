import { z } from "zod";

export const paymentWebhookSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.enum(["payment.succeeded", "payment.failed"]),
  orderId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  amount: z.number().int().nonnegative(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const releasePayoutSchema = z
  .object({
    payoutId: z.string().min(1).optional(),
    vendorProfileId: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const providedCount = Number(!!value.payoutId) + Number(!!value.vendorProfileId);

    if (providedCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Provide exactly one of payoutId or vendorProfileId",
        path: ["payoutId"],
      });
    }
  });
