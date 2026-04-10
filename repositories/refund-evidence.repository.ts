import { prisma } from "@/lib/db/prisma";

const refundEvidenceDelegate = (prisma as typeof prisma & {
  refundEvidence: {
    create: (...args: never[]) => ReturnType<typeof prisma.order.create>;
  };
}).refundEvidence;

export class RefundEvidenceRepository {
  create(input: {
    refundCaseId: string;
    actorUserId?: string;
    actorRole: "CUSTOMER" | "VENDOR" | "ADMIN";
    fileUrl?: string;
    note?: string;
  }) {
    return refundEvidenceDelegate.create({
      data: {
        refundCaseId: input.refundCaseId,
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole,
        fileUrl: input.fileUrl ?? null,
        note: input.note ?? null,
      },
    });
  }
}
