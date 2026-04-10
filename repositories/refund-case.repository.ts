import { prisma } from "@/lib/db/prisma";

type RefundCaseStatus =
  | "REQUESTED"
  | "WAITING_VENDOR"
  | "ESCALATED_ADMIN"
  | "RESOLVED";

const refundCaseDelegate = (prisma as typeof prisma & {
  refundCase: {
    create: (...args: never[]) => ReturnType<typeof prisma.order.create>;
    findUnique: (...args: never[]) => ReturnType<typeof prisma.order.findUnique>;
    findMany: (...args: never[]) => ReturnType<typeof prisma.order.findMany>;
    update: (...args: never[]) => ReturnType<typeof prisma.order.update>;
  };
}).refundCase;

export class RefundCaseRepository {
  create(input: {
    orderId: string;
    orderItemId: string;
    customerUserId: string;
    vendorProfileId: string;
    reason: string;
    description?: string;
    requestedAmount: number;
    status: RefundCaseStatus;
    vendorResponseDueAt?: Date;
  }) {
    return refundCaseDelegate.create({
      data: {
        orderId: input.orderId,
        orderItemId: input.orderItemId,
        customerUserId: input.customerUserId,
        vendorProfileId: input.vendorProfileId,
        reason: input.reason,
        description: input.description ?? null,
        requestedAmount: input.requestedAmount,
        status: input.status,
        vendorResponseDueAt: input.vendorResponseDueAt ?? null,
      },
      include: {
        order: true,
        orderItem: {
          include: {
            orderVendor: {
              include: {
                vendorProfile: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        customerUser: true,
        decision: true,
        evidences: true,
        messages: true,
      },
    });
  }

  findById(id: string) {
    return refundCaseDelegate.findUnique({
      where: { id },
      include: {
        order: true,
        orderItem: {
          include: {
            orderVendor: {
              include: {
                vendorProfile: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            product: true,
          },
        },
        customerUser: true,
        decision: true,
        evidences: true,
        messages: {
          include: {
            senderUser: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  listOverdue(now: Date) {
    return refundCaseDelegate.findMany({
      where: {
        status: "WAITING_VENDOR",
        vendorResponseDueAt: {
          lte: now,
        },
      },
      include: {
        order: true,
        orderItem: {
          include: {
            orderVendor: true,
          },
        },
        customerUser: true,
        decision: true,
      },
    });
  }

  listByOrderId(orderId: string) {
    return refundCaseDelegate.findMany({
      where: { orderId },
      include: {
        decision: true,
      },
    });
  }

  listAll() {
    return refundCaseDelegate.findMany({
      include: {
        decision: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  update(input: {
    id: string;
    status?: RefundCaseStatus;
    vendorExplanation?: string | null;
    escalatedAt?: Date | null;
    finalDecisionAt?: Date | null;
    vendorResponseDueAt?: Date | null;
  }) {
    return refundCaseDelegate.update({
      where: { id: input.id },
      data: {
        status: input.status,
        vendorExplanation: input.vendorExplanation,
        escalatedAt: input.escalatedAt,
        finalDecisionAt: input.finalDecisionAt,
        vendorResponseDueAt: input.vendorResponseDueAt,
      },
      include: {
        order: true,
        orderItem: {
          include: {
            orderVendor: {
              include: {
                vendorProfile: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            product: true,
          },
        },
        customerUser: true,
        decision: true,
        evidences: true,
        messages: {
          include: {
            senderUser: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }
}
