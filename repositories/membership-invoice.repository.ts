import { prisma } from "@/lib/db/prisma";

const membershipInvoiceDelegate = (prisma as typeof prisma & {
  membershipInvoice: {
    create: (...args: never[]) => ReturnType<typeof prisma.order.create>;
    findFirst: (...args: never[]) => ReturnType<typeof prisma.order.findFirst>;
    findMany: (...args: never[]) => ReturnType<typeof prisma.order.findMany>;
    update: (...args: never[]) => ReturnType<typeof prisma.order.update>;
  };
}).membershipInvoice;

export class MembershipInvoiceRepository {
  create(input: {
    vendorProfileId: string;
    periodStart: Date;
    periodEnd: Date;
    dueAt: Date;
    amount: number;
    currency: string;
    status?: "PENDING" | "PAID" | "WAIVED" | "VOID";
    paidAt?: Date | null;
    waivedReason?: string | null;
  }) {
    return membershipInvoiceDelegate.create({
      data: {
        vendorProfileId: input.vendorProfileId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        dueAt: input.dueAt,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        paidAt: input.paidAt ?? null,
        waivedReason: input.waivedReason ?? null,
      },
      include: {
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  findByVendorAndPeriod(input: {
    vendorProfileId: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    return membershipInvoiceDelegate.findFirst({
      where: {
        vendorProfileId: input.vendorProfileId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
      include: {
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  listByVendorProfileId(vendorProfileId: string) {
    return membershipInvoiceDelegate.findMany({
      where: { vendorProfileId },
      include: {
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });
  }

  listAll() {
    return membershipInvoiceDelegate.findMany({
      include: {
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    });
  }

  markPaid(id: string, paidAt = new Date()) {
    return membershipInvoiceDelegate.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt,
      },
      include: {
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  findById(id: string) {
    return membershipInvoiceDelegate.findFirst({
      where: { id },
      include: {
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
    });
  }
}
