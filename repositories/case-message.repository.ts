import { prisma } from "@/lib/db/prisma";

const caseMessageDelegate = (prisma as typeof prisma & {
  caseMessage: {
    create: (...args: never[]) => ReturnType<typeof prisma.order.create>;
    findMany: (...args: never[]) => ReturnType<typeof prisma.order.findMany>;
  };
}).caseMessage;

export class CaseMessageRepository {
  create(input: {
    refundCaseId: string;
    senderUserId: string;
    senderRole: "CUSTOMER" | "VENDOR" | "ADMIN";
    message: string;
    attachmentUrl?: string;
  }) {
    return caseMessageDelegate.create({
      data: {
        refundCaseId: input.refundCaseId,
        senderUserId: input.senderUserId,
        senderRole: input.senderRole,
        message: input.message,
        attachmentUrl: input.attachmentUrl ?? null,
      },
      include: {
        senderUser: true,
      },
    });
  }

  listByRefundCaseId(refundCaseId: string) {
    return caseMessageDelegate.findMany({
      where: { refundCaseId },
      include: {
        senderUser: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }
}
