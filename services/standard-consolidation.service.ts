import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { prisma } from "@/lib/db/prisma";
import { AuditLogRepository } from "@/repositories/audit-log.repository";

type StandardVendorOrder = {
  id: string;
  status: string;
  deliveryMethod: "PICKUP" | "EXPRESS" | "STANDARD" | null;
  vendorProfileId: string;
  orderId: string;
  vendorProfile: {
    userId: string;
    sellerType: "PLATFORM" | "THIRD_PARTY";
    status: "ONBOARDING" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  };
};

export class StandardConsolidationService {
  constructor(private readonly auditLogRepository = new AuditLogRepository()) {}

  async initializeForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendorOrders: {
          include: {
            vendorProfile: {
              select: {
                sellerType: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    const standardVendorOrders = order.vendorOrders.filter(
      (vendorOrder) =>
        vendorOrder.deliveryMethod === "STANDARD" &&
        vendorOrder.vendorProfile.sellerType === "THIRD_PARTY" &&
        vendorOrder.status !== "CANCELLED"
    );

    if (standardVendorOrders.length === 0) {
      return null;
    }

    const batch = await prisma.consolidationBatch.upsert({
      where: { orderId: order.id },
      update: {
        expectedVendorCount: standardVendorOrders.length,
      },
      create: {
        orderId: order.id,
        expectedVendorCount: standardVendorOrders.length,
      },
    });

    await Promise.all(
      standardVendorOrders.map((vendorOrder) =>
        prisma.vendorInboundShipment.upsert({
          where: { orderVendorId: vendorOrder.id },
          update: {
            consolidationBatchId: batch.id,
            vendorProfileId: vendorOrder.vendorProfileId,
          },
          create: {
            orderId: order.id,
            orderVendorId: vendorOrder.id,
            consolidationBatchId: batch.id,
            vendorProfileId: vendorOrder.vendorProfileId,
          },
        })
      )
    );

    return this.refreshBatchReadiness(batch.id);
  }

  async markVendorOrderInboundShipped(
    auth: AuthenticatedUser,
    vendorOrderId: string,
    input: { trackingRef?: string }
  ) {
    const vendorOrder = (await prisma.orderVendor.findUnique({
      where: { id: vendorOrderId },
      include: {
        vendorProfile: {
          select: {
            userId: true,
            sellerType: true,
            status: true,
          },
        },
      },
    })) as StandardVendorOrder | null;

    if (!vendorOrder) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor order not found",
        statusCode: 404,
      });
    }

    if (vendorOrder.vendorProfile.userId !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Vendor order not found",
        statusCode: 404,
      });
    }

    if (vendorOrder.vendorProfile.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active vendors can update inbound shipments",
        statusCode: 403,
      });
    }

    this.assertStandardVendorOrder(vendorOrder);

    if (vendorOrder.status === "CANCELLED") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cancelled orders cannot be shipped inbound",
        statusCode: 400,
      });
    }

    const allowedCurrentStatuses = ["NEW", "PREPARING", "INBOUND_SHIPPED"] as const;
    if (!allowedCurrentStatuses.includes(vendorOrder.status as (typeof allowedCurrentStatuses)[number])) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: `Cannot mark inbound shipment from status ${vendorOrder.status}`,
        statusCode: 400,
      });
    }

    const batch = await this.initializeForOrder(vendorOrder.orderId);
    if (!batch) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "No standard consolidation batch found for this order",
        statusCode: 400,
      });
    }

    const now = new Date();
    const shipment = await prisma.vendorInboundShipment.update({
      where: { orderVendorId: vendorOrder.id },
      data: {
        status: "INBOUND_SHIPPED",
        trackingRef: input.trackingRef ?? undefined,
        shippedAt: now,
      },
    });

    await prisma.orderVendor.update({
      where: { id: vendorOrder.id },
      data: {
        status: "INBOUND_SHIPPED",
      },
    });

    await this.recalculateOrderStatus(vendorOrder.orderId);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.inbound_shipped",
      entityType: "VendorInboundShipment",
      entityId: shipment.id,
      metadata: {
        orderId: vendorOrder.orderId,
        vendorOrderId: vendorOrder.id,
        trackingRef: shipment.trackingRef ?? null,
      },
    });

    return {
      shipmentId: shipment.id,
      vendorOrderId: vendorOrder.id,
      status: shipment.status,
      shippedAt: shipment.shippedAt?.toISOString() ?? null,
      trackingRef: shipment.trackingRef ?? null,
      consolidationBatchId: batch.id,
      consolidationBatchStatus: batch.status,
    };
  }

  async markInboundShipmentReceived(auth: AuthenticatedUser, shipmentId: string) {
    const shipment = await prisma.vendorInboundShipment.findUnique({
      where: { id: shipmentId },
      include: {
        orderVendor: {
          include: {
            vendorProfile: {
              select: {
                sellerType: true,
              },
            },
          },
        },
        consolidationBatch: true,
      },
    });

    if (!shipment) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Inbound shipment not found",
        statusCode: 404,
      });
    }

    if (
      shipment.orderVendor.deliveryMethod !== "STANDARD" ||
      shipment.orderVendor.vendorProfile.sellerType !== "THIRD_PARTY"
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only third-party standard shipments can be received",
        statusCode: 400,
      });
    }

    if (
      shipment.status !== "INBOUND_SHIPPED" &&
      shipment.status !== "RECEIVED"
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Shipment must be marked inbound shipped before it can be received",
        statusCode: 400,
      });
    }

    const now = new Date();
    const updatedShipment = await prisma.vendorInboundShipment.update({
      where: { id: shipment.id },
      data: {
        status: "RECEIVED",
        receivedAt: now,
      },
    });

    await prisma.orderVendor.update({
      where: { id: shipment.orderVendorId },
      data: {
        status: "RECEIVED_AT_WAREHOUSE",
      },
    });

    const batch = await this.refreshBatchReadiness(shipment.consolidationBatchId);
    await this.recalculateOrderStatus(shipment.orderId);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.inbound_received",
      entityType: "VendorInboundShipment",
      entityId: updatedShipment.id,
      metadata: {
        orderId: shipment.orderId,
        vendorOrderId: shipment.orderVendorId,
        consolidationBatchId: shipment.consolidationBatchId,
        consolidationBatchStatus: batch.status,
      },
    });

    return {
      shipmentId: updatedShipment.id,
      status: updatedShipment.status,
      receivedAt: updatedShipment.receivedAt?.toISOString() ?? null,
      consolidationBatchId: batch.id,
      consolidationBatchStatus: batch.status,
      expectedVendorCount: batch.expectedVendorCount,
      receivedVendorCount: batch.receivedVendorCount,
      readyToConsolidateAt: batch.readyToConsolidateAt?.toISOString() ?? null,
    };
  }

  async consolidateReadyBatch(
    auth: AuthenticatedUser,
    batchId: string,
    input: { trackingRef?: string }
  ) {
    const batch = await prisma.consolidationBatch.findUnique({
      where: { id: batchId },
      include: {
        outboundShipment: true,
      },
    });

    if (!batch) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Consolidation batch not found",
        statusCode: 404,
      });
    }

    if (batch.status !== "READY_TO_CONSOLIDATE") {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only READY_TO_CONSOLIDATE batches can be consolidated",
        statusCode: 400,
      });
    }

    if (batch.outboundShipment) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Outbound shipment already exists for this batch",
        statusCode: 400,
      });
    }

    const now = new Date();
    const outboundShipment = await prisma.consolidatedOutboundShipment.create({
      data: {
        orderId: batch.orderId,
        consolidationBatchId: batch.id,
        status: "CONSOLIDATED",
        trackingRef: input.trackingRef ?? undefined,
        consolidatedAt: now,
      },
    });

    const updatedBatch = await prisma.consolidationBatch.update({
      where: { id: batch.id },
      data: {
        status: "CONSOLIDATED",
      },
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.batch_consolidated",
      entityType: "ConsolidationBatch",
      entityId: updatedBatch.id,
      metadata: {
        orderId: batch.orderId,
        outboundShipmentId: outboundShipment.id,
      },
    });

    return {
      consolidationBatchId: updatedBatch.id,
      consolidationBatchStatus: updatedBatch.status,
      outboundShipmentId: outboundShipment.id,
      outboundShipmentStatus: outboundShipment.status,
      consolidatedAt: outboundShipment.consolidatedAt?.toISOString() ?? null,
      trackingRef: outboundShipment.trackingRef ?? null,
    };
  }

  async markOutboundShipmentShipped(
    auth: AuthenticatedUser,
    outboundShipmentId: string,
    input: { trackingRef?: string }
  ) {
    const outboundShipment = await prisma.consolidatedOutboundShipment.findUnique({
      where: { id: outboundShipmentId },
      include: {
        consolidationBatch: true,
      },
    });

    if (!outboundShipment) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Outbound shipment not found",
        statusCode: 404,
      });
    }

    if (
      outboundShipment.status !== "CONSOLIDATED" &&
      outboundShipment.status !== "OUTBOUND_SHIPPED"
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Outbound shipment must be CONSOLIDATED before shipping",
        statusCode: 400,
      });
    }

    const now = new Date();
    const updatedOutboundShipment = await prisma.consolidatedOutboundShipment.update({
      where: { id: outboundShipment.id },
      data: {
        status: "OUTBOUND_SHIPPED",
        shippedAt: now,
        trackingRef: input.trackingRef ?? outboundShipment.trackingRef ?? undefined,
      },
    });

    const updatedBatch = await prisma.consolidationBatch.update({
      where: { id: outboundShipment.consolidationBatchId },
      data: {
        status: "OUTBOUND_SHIPPED",
      },
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.outbound_shipped",
      entityType: "ConsolidatedOutboundShipment",
      entityId: updatedOutboundShipment.id,
      metadata: {
        orderId: outboundShipment.orderId,
        consolidationBatchId: outboundShipment.consolidationBatchId,
      },
    });

    return {
      outboundShipmentId: updatedOutboundShipment.id,
      outboundShipmentStatus: updatedOutboundShipment.status,
      shippedAt: updatedOutboundShipment.shippedAt?.toISOString() ?? null,
      trackingRef: updatedOutboundShipment.trackingRef ?? null,
      consolidationBatchId: updatedBatch.id,
      consolidationBatchStatus: updatedBatch.status,
    };
  }

  async markOutboundShipmentDelivered(auth: AuthenticatedUser, outboundShipmentId: string) {
    const outboundShipment = await prisma.consolidatedOutboundShipment.findUnique({
      where: { id: outboundShipmentId },
      include: {
        consolidationBatch: {
          include: {
            inboundShipments: {
              select: {
                orderVendorId: true,
              },
            },
          },
        },
      },
    });

    if (!outboundShipment) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Outbound shipment not found",
        statusCode: 404,
      });
    }

    if (
      outboundShipment.status !== "OUTBOUND_SHIPPED" &&
      outboundShipment.status !== "DELIVERED"
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Outbound shipment must be shipped before delivery",
        statusCode: 400,
      });
    }

    const vendorOrderIds = outboundShipment.consolidationBatch.inboundShipments.map(
      (shipment) => shipment.orderVendorId
    );

    const now = new Date();
    await prisma.$transaction([
      prisma.consolidatedOutboundShipment.update({
        where: { id: outboundShipment.id },
        data: {
          status: "DELIVERED",
          deliveredAt: now,
        },
      }),
      prisma.consolidationBatch.update({
        where: { id: outboundShipment.consolidationBatchId },
        data: {
          status: "DELIVERED",
        },
      }),
      prisma.orderVendor.updateMany({
        where: {
          id: { in: vendorOrderIds },
          status: { not: "CANCELLED" },
        },
        data: {
          status: "DELIVERED",
          deliveredAt: now,
        },
      }),
    ]);

    await this.recalculateOrderStatus(outboundShipment.orderId);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "admin.outbound_delivered",
      entityType: "ConsolidatedOutboundShipment",
      entityId: outboundShipment.id,
      metadata: {
        orderId: outboundShipment.orderId,
        consolidationBatchId: outboundShipment.consolidationBatchId,
        deliveredVendorOrdersCount: vendorOrderIds.length,
      },
    });

    return {
      outboundShipmentId: outboundShipment.id,
      outboundShipmentStatus: "DELIVERED" as const,
      deliveredAt: now.toISOString(),
      consolidationBatchId: outboundShipment.consolidationBatchId,
      consolidationBatchStatus: "DELIVERED" as const,
      deliveredVendorOrdersCount: vendorOrderIds.length,
    };
  }

  private assertStandardVendorOrder(vendorOrder: StandardVendorOrder) {
    if (
      vendorOrder.deliveryMethod !== "STANDARD" ||
      vendorOrder.vendorProfile.sellerType !== "THIRD_PARTY"
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "This action is only available for third-party STANDARD orders",
        statusCode: 400,
      });
    }
  }

  private async refreshBatchReadiness(batchId: string) {
    const batch = await prisma.consolidationBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Consolidation batch not found",
        statusCode: 404,
      });
    }

    if (
      batch.status === "CONSOLIDATED" ||
      batch.status === "OUTBOUND_SHIPPED" ||
      batch.status === "DELIVERED" ||
      batch.status === "CANCELLED"
    ) {
      return batch;
    }

    const shipments = await prisma.vendorInboundShipment.findMany({
      where: {
        consolidationBatchId: batch.id,
      },
      select: {
        status: true,
      },
    });

    const receivedVendorCount = shipments.filter(
      (shipment) => shipment.status === "RECEIVED"
    ).length;

    const allReceived =
      batch.expectedVendorCount > 0 &&
      receivedVendorCount >= batch.expectedVendorCount;

    const nextStatus = allReceived
      ? "READY_TO_CONSOLIDATE"
      : receivedVendorCount > 0
        ? "PARTIALLY_RECEIVED"
        : "OPEN";

    return prisma.consolidationBatch.update({
      where: { id: batch.id },
      data: {
        receivedVendorCount,
        status: nextStatus,
        readyToConsolidateAt:
          nextStatus === "READY_TO_CONSOLIDATE" ? batch.readyToConsolidateAt ?? new Date() : null,
      },
    });
  }

  private async recalculateOrderStatus(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { vendorOrders: true },
    });

    if (!order) return;

    const statuses = order.vendorOrders.map((vendorOrder) => vendorOrder.status);

    let nextStatus: "CREATED" | "PAID" | "PARTIALLY_FULFILLED" | "FULFILLED" | "CANCELLED";

    if (statuses.every((status) => status === "CANCELLED")) {
      nextStatus = "CANCELLED";
    } else if (statuses.every((status) => status === "DELIVERED")) {
      nextStatus = "FULFILLED";
    } else if (
      statuses.some(
        (status) =>
          status === "PREPARING" ||
          status === "INBOUND_SHIPPED" ||
          status === "RECEIVED_AT_WAREHOUSE" ||
          status === "SHIPPED" ||
          status === "DELIVERED"
      )
    ) {
      nextStatus = "PARTIALLY_FULFILLED";
    } else if (order.paymentStatus === "PAID") {
      nextStatus = "PAID";
    } else {
      nextStatus = "CREATED";
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
      },
    });
  }
}
