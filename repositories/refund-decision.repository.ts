import { prisma } from "@/lib/db/prisma";

type RefundDecisionType = "APPROVE" | "REJECT" | "PARTIAL";

const refundDecisionDelegate = (prisma as typeof prisma & {
  refundDecision: {
    create: (...args: never[]) => ReturnType<typeof prisma.order.create>;
  };
}).refundDecision;

export class RefundDecisionRepository {
  create(input: {
    refundCaseId: string;
    decisionType: RefundDecisionType;
    approvedAmount: number;
    reason?: string;
    stripeRefundId?: string;
    stripeRefundStatus?: string;
    stripeRefundFailureCode?: string;
    stripeRefundFailureReason?: string;
    stripeRefundAttemptedAt?: Date;
    decidedByUserId: string;
  }) {
    return refundDecisionDelegate.create({
      data: {
        refundCaseId: input.refundCaseId,
        decisionType: input.decisionType,
        approvedAmount: input.approvedAmount,
        reason: input.reason ?? null,
        stripeRefundId: input.stripeRefundId ?? null,
        stripeRefundStatus: input.stripeRefundStatus ?? null,
        stripeRefundFailureCode: input.stripeRefundFailureCode ?? null,
        stripeRefundFailureReason: input.stripeRefundFailureReason ?? null,
        stripeRefundAttemptedAt: input.stripeRefundAttemptedAt ?? null,
        decidedByUserId: input.decidedByUserId,
      },
    });
  }
}
