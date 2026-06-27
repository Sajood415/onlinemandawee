import { z } from "zod";

const refundCaseStatuses = [
  "REQUESTED",
  "WAITING_VENDOR",
  "ESCALATED_ADMIN",
  "RESOLVED",
] as const;

export const refundCaseIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const refundListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(refundCaseStatuses).optional(),
    search: z.string().trim().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    overdueOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "to must be on or after from",
      });
    }
  });

export const adminRefundListQuerySchema = refundListQuerySchema.extend({
  vendorProfileId: z.string().trim().min(1).optional(),
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

export const adminRefundStatusSchema = z.object({
  status: z.enum(refundCaseStatuses),
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

export const adminUpdateRefundDecisionSchema = adminRefundDecisionSchema;

export const adminOrderRefundSchema = z
  .object({
    reason: z.string().trim().min(3).max(1000),
    orderItemId: z.string().min(1).optional(),
    approvedAmount: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.approvedAmount != null && !value.orderItemId) {
      ctx.addIssue({
        code: "custom",
        path: ["approvedAmount"],
        message: "Partial refunds require a specific order item",
      });
    }
  });

export const adminOrderFlagDisputeSchema = z.object({
  note: z.string().trim().min(3).max(1000),
});
