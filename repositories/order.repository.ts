import type {
  OrderStatus,
  PaymentStatus,
  VendorOrderStatus,
} from "@/domain/order/order-status";
import { prisma } from "@/lib/db/prisma";

export class OrderRepository {
  create(input: {
    userId: string;
    orderNumber: string;
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
        userId: input.userId,
        orderNumber: input.orderNumber,
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
      include: {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  updateVendorOrderStatus(id: string, status: VendorOrderStatus) {
    return prisma.orderVendor.update({
      where: { id },
      data: { status },
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
