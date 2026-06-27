import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type RefundCaseStatus =
  | "REQUESTED"
  | "WAITING_VENDOR"
  | "ESCALATED_ADMIN"
  | "RESOLVED";

export type RefundCaseListFilters = {
  page: number;
  pageSize: number;
  status?: RefundCaseStatus;
  vendorProfileId?: string;
  customerUserId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  overdueOnly?: boolean;
};

function endOfUtcDay(date: Date) {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

function buildRefundCaseWhere(filters: RefundCaseListFilters): Prisma.RefundCaseWhereInput {
  const and: Prisma.RefundCaseWhereInput[] = [];

  if (filters.customerUserId) {
    and.push({ customerUserId: filters.customerUserId });
  }

  if (filters.vendorProfileId) {
    and.push({ vendorProfileId: filters.vendorProfileId });
  }

  if (filters.status) {
    and.push({ status: filters.status });
  }

  if (filters.overdueOnly) {
    and.push({
      status: "WAITING_VENDOR",
      vendorResponseDueAt: {
        lte: new Date(),
      },
    });
  }

  if (filters.from || filters.to) {
    and.push({
      createdAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: endOfUtcDay(filters.to) } : {}),
      },
    });
  }

  const search = filters.search?.trim();
  if (search) {
    and.push({
      OR: [
        { reason: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { order: { is: { orderNumber: { contains: search, mode: "insensitive" } } } },
        {
          customerUser: {
            is: {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
        {
          orderItem: {
            is: {
              productName: { contains: search, mode: "insensitive" },
            },
          },
        },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

const listInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      paymentStatus: true,
      currency: true,
    },
  },
  orderItem: {
    select: {
      id: true,
      productId: true,
      productName: true,
      productImage: true,
      quantity: true,
      lineTotalAmount: true,
      orderVendor: {
        select: {
          vendorProfile: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  },
  customerUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  decision: true,
  evidences: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} satisfies Prisma.RefundCaseInclude;

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
    activeOrderItemKey?: string | null;
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
        activeOrderItemKey: input.activeOrderItemKey ?? input.orderItemId,
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

  countWithFilters(filters: RefundCaseListFilters) {
    return refundCaseDelegate.count({
      where: buildRefundCaseWhere(filters),
    });
  }

  listWithFilters(filters: RefundCaseListFilters) {
    const skip = (filters.page - 1) * filters.pageSize;
    return refundCaseDelegate.findMany({
      where: buildRefundCaseWhere(filters),
      include: listInclude,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: filters.pageSize,
    });
  }

  update(input: {
    id: string;
    status?: RefundCaseStatus;
    activeOrderItemKey?: string | null;
    vendorExplanation?: string | null;
    escalatedAt?: Date | null;
    finalDecisionAt?: Date | null;
    vendorResponseDueAt?: Date | null;
  }) {
    return refundCaseDelegate.update({
      where: { id: input.id },
      data: {
        status: input.status,
        activeOrderItemKey:
          input.status === "RESOLVED" ? null : input.activeOrderItemKey,
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
