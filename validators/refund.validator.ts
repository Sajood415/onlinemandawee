import { z } from "zod";

export const refundCaseIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const refundRequestSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(1000).optional(),
  requestedAmount: z.number().int().positive(),
  evidenceFileUrl: z.url().max(2048).optional(),
  evidenceNote: z.string().trim().min(1).max(500).optional(),
});

export const vendorRefundResponseSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
  explanation: z.string().trim().min(3).max(1000),
  evidenceFileUrl: z.url().max(2048).optional(),
  evidenceNote: z.string().trim().min(1).max(500).optional(),
});

export const refundMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  attachmentUrl: z.url().max(2048).optional(),
});

export const adminRefundDecisionSchema = z
  .object({
    decisionType: z.enum(["APPROVE", "REJECT", "PARTIAL"]),
    approvedAmount: z.number().int().min(0),
    reason: z.string().trim().min(3).max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decisionType === "APPROVE" && value.approvedAmount <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["approvedAmount"],
        message: "Approved amount must be greater than zero",
      });
    }

    if (value.decisionType === "REJECT" && value.approvedAmount !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["approvedAmount"],
        message: "Rejected refunds must have zero approved amount",
      });
    }

    if (value.decisionType === "PARTIAL" && value.approvedAmount <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["approvedAmount"],
        message: "Partial refund must approve an amount greater than zero",
      });
    }
  });
