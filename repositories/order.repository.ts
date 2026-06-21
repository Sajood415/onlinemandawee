import type { Prisma } from "@prisma/client";

import type {
  AdminOrderStatusFilter,
  OrderStatus,
  PaymentStatus,
  VendorOrderStatus,
} from "@/domain/order/order-status";
import { prisma } from "@/lib/db/prisma";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { guestTrackingOrderInclude } from "@/lib/orders/serialize-guest-public-order";

const orderAdminInclude = {
  user: true,
  vendorOrders: {
    include: {
      vendorProfile: {
        include: {
          user: true,
        },
      },
      items: true,
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithAdminRelations = Prisma.OrderGetPayload<{
  include: typeof orderAdminInclude;
}>;

export type AdminOrderListFilters = {
  page: number;
  pageSize: number;
  vendorProfileId?: string;
  statusFilter?: AdminOrderStatusFilter;
  from?: Date;
  to?: Date;
  search?: string;
};

function buildAdminStatusFilterWhere(
  statusFilter: AdminOrderStatusFilter
): Prisma.OrderWhereInput {
  switch (statusFilter) {
    case "PENDING":
      return {
        AND: [
          { status: { not: "CANCELLED" } },
          { paymentStatus: { notIn: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
          {
            OR: [
              { paymentStatus: { in: ["UNPAID", "PENDING"] } },
              {
                vendorOrders: {
                  some: { status: { in: ["NEW", "PREPARING"] } },
                },
              },
            ],
          },
        ],
      };
    case "SHIPPED":
      return {
        vendorOrders: {
          some: { status: "SHIPPED" },
        },
      };
    case "DELIVERED":
      return {
        vendorOrders: {
          some: { status: "DELIVERED" },
        },
      };
    case "CANCELLED":
      return {
        OR: [
          { status: "CANCELLED" },
          {
            vendorOrders: {
              some: { status: "CANCELLED" },
            },
          },
        ],
      };
    case "REFUNDED":
      return {
        paymentStatus: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
      };
  }
}

function endOfUtcDay(date: Date) {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
}

function buildAdminOrderWhere(filters: AdminOrderListFilters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];

  if (filters.from || filters.to) {
    and.push({
      createdAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: endOfUtcDay(filters.to) } : {}),
      },
    });
  }

  if (filters.statusFilter) {
    and.push(buildAdminStatusFilterWhere(filters.statusFilter));
  }

  if (filters.vendorProfileId) {
    and.push({
      vendorOrders: {
        some: { vendorProfileId: filters.vendorProfileId },
      },
    });
  }

  const search = filters.search?.trim();
  if (search) {
    and.push({
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { guestEmail: { contains: search, mode: "insensitive" } },
        { shippingFullName: { contains: search, mode: "insensitive" } },
        { shippingPhone: { contains: search, mode: "insensitive" } },
        {
          user: {
            is: {
              email: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          user: {
            is: {
              fullName: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          user: {
            is: {
              phone: { contains: search, mode: "insensitive" },
            },
          },
        },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export class OrderRepository {
  create(input: {
    userId?: string | null;
    guestEmail?: string | null;
    stripePaymentIntentId?: string | null;
    orderNumber: string;
    deliveryMethod?: "PICKUP" | "EXPRESS" | "STANDARD";
    currency: string;
    subtotalAmount: number;
    deliveryAmount: number;
    discountAmount: number;
    grandTotalAmount: number;
    shippingFullName: string;
    shippingPhone: string;
    shippingAddressLine1: string;
    shippingCity: string;
    shippingCountry: string;
    shippingPostalCode: string;
    vendorOrders: Array<{
      vendorProfileId: string;
      status?: VendorOrderStatus;
      deliveryMethod?: "PICKUP" | "EXPRESS" | "STANDARD";
      currency: string;
      subtotalAmount: number;
      deliveryAmount: number;
      discountAmount: number;
      grandTotalAmount: number;
      items: Array<{
        productId: string;
        quantity: number;
        currency: string;
        unitPriceAmount: number;
        lineTotalAmount: number;
        productName: string;
        productImage?: string | null;
        productSku?: string | null;
        vendorProfileId: string;
        categoryId: string;
      }>;
    }>;
  }) {
    return prisma.order.create({
      data: {
        userId: input.userId ?? undefined,
        guestEmail: input.guestEmail ?? undefined,
        stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
        orderNumber: input.orderNumber,
        deliveryMethod: input.deliveryMethod ?? undefined,
        currency: input.currency,
        subtotalAmount: input.subtotalAmount,
        deliveryAmount: input.deliveryAmount,
        discountAmount: input.discountAmount,
        grandTotalAmount: input.grandTotalAmount,
        shippingFullName: input.shippingFullName,
        shippingPhone: input.shippingPhone,
        shippingAddressLine1: input.shippingAddressLine1,
        shippingCity: input.shippingCity,
        shippingCountry: input.shippingCountry,
        shippingPostalCode: input.shippingPostalCode,
        vendorOrders: {
          create: input.vendorOrders.map((vendorOrder) => ({
            vendorProfileId: vendorOrder.vendorProfileId,
            status: vendorOrder.status ?? "NEW",
            deliveryMethod: vendorOrder.deliveryMethod ?? undefined,
            currency: vendorOrder.currency,
            subtotalAmount: vendorOrder.subtotalAmount,
            deliveryAmount: vendorOrder.deliveryAmount,
            discountAmount: vendorOrder.discountAmount,
            grandTotalAmount: vendorOrder.grandTotalAmount,
            items: {
              create: vendorOrder.items,
            },
          })),
        },
      },
      include: {
        vendorOrders: {
          include: {
            vendorProfile: {
              include: {
                user: true,
              },
            },
            items: true,
          },
        },
      },
    });
  }

  listByUserId(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: {
        vendorOrders: {
          include: {
            vendorProfile: {
              include: {
                user: true,
              },
            },
            items: true,
          },
        },
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async backfillMissingDeliveredAtForUser(userId: string) {
    const vendorOrders = await prisma.orderVendor.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: null,
        order: { userId },
      },
      select: { id: true, updatedAt: true },
    });

    await Promise.all(
      vendorOrders.map((vendorOrder) =>
        prisma.orderVendor.update({
          where: { id: vendorOrder.id },
          data: { deliveredAt: vendorOrder.updatedAt },
        })
      )
    );
  }

  async claimGuestOrdersForUser(userId: string, email: string) {
    const normalizedEmail = normalizeEmailForAuth(email);

    // Prisma + MongoDB: `userId: null` in where does not match unset/null fields reliably.
    // Load candidate guest orders and filter unclaimed rows in application code.
    const candidates = await prisma.order.findMany({
      where: { guestEmail: { not: null } },
      select: { id: true, guestEmail: true, userId: true },
    });

    const orderIds = candidates
      .filter(
        (order) =>
          order.userId == null &&
          order.guestEmail != null &&
          normalizeEmailForAuth(order.guestEmail) === normalizedEmail
      )
      .map((order) => order.id);

    if (orderIds.length === 0) {
      return 0;
    }

    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { userId },
    });

    return orderIds.length;
  }

  findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        vendorOrders: {
          include: {
            vendorProfile: {
              include: {
                user: true,
              },
            },
            items: true,
          },
        },
        user: true,
      },
    });
  }

  findByOrderNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
    });
  }

  findByGuestTrackingToken(token: string) {
    return prisma.order.findFirst({
      where: { guestTrackingToken: token },
      include: guestTrackingOrderInclude,
    });
  }

  findByOrderNumberForGuestTracking(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: guestTrackingOrderInclude,
    });
  }

  setGuestTrackingToken(orderId: string, guestTrackingToken: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: { guestTrackingToken },
      include: guestTrackingOrderInclude,
    });
  }

  listByVendorProfileId(vendorProfileId: string) {
    return prisma.orderVendor.findMany({
      where: { vendorProfileId },
      include: {
        order: true,
        vendorProfile: true,
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findVendorOrderById(id: string) {
    return prisma.orderVendor.findUnique({
      where: { id },
      include: {
        order: true,
        vendorProfile: {
          include: {
            user: true,
          },
        },
        items: true,
      },
    });
  }

  findOrderItemById(id: string) {
    return prisma.orderItem.findUnique({
      where: { id },
      include: {
        orderVendor: {
          include: {
            order: true,
            vendorProfile: {
              include: {
                user: true,
              },
            },
          },
        },
        product: true,
      },
    });
  }

  listAll() {
    return prisma.order.findMany({
      include: orderAdminInclude,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  countForAdmin(filters: AdminOrderListFilters) {
    return prisma.order.count({
      where: buildAdminOrderWhere(filters),
    });
  }

  listForAdmin(filters: AdminOrderListFilters) {
    const skip = (filters.page - 1) * filters.pageSize;

    return prisma.order.findMany({
      where: buildAdminOrderWhere(filters),
      include: orderAdminInclude,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: filters.pageSize,
    });
  }

  findByIdForAdmin(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: orderAdminInclude,
    });
  }

  updateVendorOrderStatus(id: string, status: VendorOrderStatus) {
    return prisma.orderVendor.update({
      where: { id },
      data: {
        status,
        ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
      include: {
        order: true,
        vendorProfile: true,
        items: true,
      },
    });
  }

  updateOrderStatus(id: string, status: OrderStatus, paymentStatus?: PaymentStatus) {
    return prisma.order.update({
      where: { id },
      data: {
        status,
        paymentStatus,
      },
      include: {
        vendorOrders: {
          include: {
            vendorProfile: true,
            items: true,
          },
        },
      },
    });
  }

  updateOrderPaymentStatus(id: string, paymentStatus: PaymentStatus) {
    return prisma.order.update({
      where: { id },
      data: {
        paymentStatus,
      },
      include: {
        vendorOrders: {
          include: {
            vendorProfile: {
              include: {
                user: true,
              },
            },
            items: true,
          },
        },
        user: true,
      },
    });
  }
}
