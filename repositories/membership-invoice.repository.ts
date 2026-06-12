import { prisma } from "@/lib/db/prisma";

const membershipInvoiceDelegate = (prisma as typeof prisma & {
  membershipInvoice: {
    create: (...args: never[]) => ReturnType<typeof prisma.order.create>;
    findFirst: (...args: never[]) => ReturnType<typeof prisma.order.findFirst>;
    findMany: (...args: never[]) => ReturnType<typeof prisma.order.findMany>;
    update: (...args: never[]) => ReturnType<typeof prisma.order.update>;
    upsert: (...args: never[]) => ReturnType<typeof prisma.order.update>;
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
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeInvoiceId?: string | null;
    stripePaymentId?: string | null;
    stripeEventId?: string | null;
    failureCode?: string | null;
    failureReason?: string | null;
    attemptedAt?: Date | null;
    invoiceHostedUrl?: string | null;
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
        stripeCustomerId: input.stripeCustomerId ?? null,
        stripeSubscriptionId: input.stripeSubscriptionId ?? null,
        stripeInvoiceId: input.stripeInvoiceId ?? null,
        stripePaymentId: input.stripePaymentId ?? null,
        stripeEventId: input.stripeEventId ?? null,
        failureCode: input.failureCode ?? null,
        failureReason: input.failureReason ?? null,
        attemptedAt: input.attemptedAt ?? null,
        invoiceHostedUrl: input.invoiceHostedUrl ?? null,
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

  upsertByStripeInvoiceId(input: {
    stripeInvoiceId: string;
    vendorProfileId: string;
    periodStart: Date;
    periodEnd: Date;
    dueAt: Date;
    amount: number;
    currency: string;
    status: "PENDING" | "PAID" | "WAIVED" | "VOID";
    paidAt?: Date | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePaymentId?: string | null;
    stripeEventId?: string | null;
    failureCode?: string | null;
    failureReason?: string | null;
    attemptedAt?: Date | null;
    invoiceHostedUrl?: string | null;
    waivedReason?: string | null;
  }) {
    return membershipInvoiceDelegate.upsert({
      where: { stripeInvoiceId: input.stripeInvoiceId },
      create: {
        vendorProfileId: input.vendorProfileId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        dueAt: input.dueAt,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        paidAt: input.paidAt ?? null,
        stripeCustomerId: input.stripeCustomerId ?? null,
        stripeSubscriptionId: input.stripeSubscriptionId ?? null,
        stripeInvoiceId: input.stripeInvoiceId,
        stripePaymentId: input.stripePaymentId ?? null,
        stripeEventId: input.stripeEventId ?? null,
        failureCode: input.failureCode ?? null,
        failureReason: input.failureReason ?? null,
        attemptedAt: input.attemptedAt ?? null,
        invoiceHostedUrl: input.invoiceHostedUrl ?? null,
        waivedReason: input.waivedReason ?? null,
      },
      update: {
        vendorProfileId: input.vendorProfileId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        dueAt: input.dueAt,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        paidAt: input.paidAt ?? null,
        stripeCustomerId: input.stripeCustomerId ?? null,
        stripeSubscriptionId: input.stripeSubscriptionId ?? null,
        stripePaymentId: input.stripePaymentId ?? null,
        stripeEventId: input.stripeEventId ?? null,
        failureCode: input.failureCode ?? null,
        failureReason: input.failureReason ?? null,
        attemptedAt: input.attemptedAt ?? null,
        invoiceHostedUrl: input.invoiceHostedUrl ?? null,
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

  markWaived(id: string, waivedReason: string) {
    return membershipInvoiceDelegate.update({
      where: { id },
      data: {
        status: "WAIVED",
        paidAt: null,
        waivedReason,
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

  markPendingByStripeInvoiceId(input: {
    stripeInvoiceId: string;
    stripeEventId?: string | null;
    stripePaymentId?: string | null;
    failureCode?: string | null;
    failureReason?: string | null;
    attemptedAt?: Date | null;
  }) {
    return membershipInvoiceDelegate.update({
      where: { stripeInvoiceId: input.stripeInvoiceId },
      data: {
        status: "PENDING",
        paidAt: null,
        stripeEventId: input.stripeEventId ?? null,
        stripePaymentId: input.stripePaymentId ?? null,
        failureCode: input.failureCode ?? null,
        failureReason: input.failureReason ?? null,
        attemptedAt: input.attemptedAt ?? null,
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

  findByStripeInvoiceId(stripeInvoiceId: string) {
    return membershipInvoiceDelegate.findFirst({
      where: { stripeInvoiceId },
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
