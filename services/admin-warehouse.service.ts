import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  aggregateOrderLineItemsByProduct,
  formatAggregatedProductLabel,
  sumOrderLineItemQuantities,
} from "@/lib/orders/aggregate-order-line-items";

type PagingInput = {
  page: number;
  pageSize: number;
  search?: string;
};

function buildPagination<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

function trackingSearchFilter(search?: string) {
  const q = search?.trim();
  if (!q) return null;
  return {
    contains: q,
    mode: "insensitive" as const,
  };
}

export class AdminWarehouseService {
  async listInboundShipments(input: {
    status?: "PENDING_SHIPMENT" | "INBOUND_SHIPPED" | "RECEIVED";
  } & PagingInput) {
    const tracking = trackingSearchFilter(input.search);
    const and: Prisma.VendorInboundShipmentWhereInput[] = [];
    if (input.status) and.push({ status: input.status });
    if (tracking) {
      and.push({
        OR: [
          { trackingRef: tracking },
          { order: { is: { orderNumber: tracking } } },
          {
            orderVendor: {
              is: { trackingRef: tracking },
            },
          },
        ],
      });
    }
    const where: Prisma.VendorInboundShipmentWhereInput =
      and.length > 0 ? { AND: and } : {};
    const skip = (input.page - 1) * input.pageSize;

    const [total, rows] = await Promise.all([
      prisma.vendorInboundShipment.count({ where }),
      prisma.vendorInboundShipment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          orderVendor: {
            select: {
              id: true,
              status: true,
              vendorProfileId: true,
              vendorProfile: {
                select: {
                  storeName: true,
                  storeSlug: true,
                },
              },
              items: {
                select: {
                  productId: true,
                  variantId: true,
                  variantName: true,
                  productName: true,
                  productSku: true,
                  quantity: true,
                  unitPriceAmount: true,
                  lineTotalAmount: true,
                },
              },
            },
          },
          consolidationBatch: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        skip,
        take: input.pageSize,
      }),
    ]);

    return buildPagination(
      rows.map((row) => {
        const products = aggregateOrderLineItemsByProduct(row.orderVendor.items);
        return {
          id: row.id,
          status: row.status,
          trackingRef: row.trackingRef,
          shippedAt: row.shippedAt?.toISOString() ?? null,
          receivedAt: row.receivedAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          totalQuantity: sumOrderLineItemQuantities(products),
          products: products.map((item) => ({
            productName: formatAggregatedProductLabel(item),
            quantity: item.quantity,
          })),
          order: {
            id: row.order.id,
            orderNumber: row.order.orderNumber,
          },
          vendorOrder: {
            id: row.orderVendor.id,
            status: row.orderVendor.status,
            vendorProfileId: row.orderVendor.vendorProfileId,
            vendorStoreName: row.orderVendor.vendorProfile.storeName,
            vendorStoreSlug: row.orderVendor.vendorProfile.storeSlug,
          },
          consolidationBatch: {
            id: row.consolidationBatch.id,
            status: row.consolidationBatch.status,
          },
        };
      }),
      total,
      input.page,
      input.pageSize
    );
  }

  async listConsolidationBatches(input: {
    status?:
      | "OPEN"
      | "PARTIALLY_RECEIVED"
      | "READY_TO_CONSOLIDATE"
      | "CONSOLIDATED"
      | "OUTBOUND_SHIPPED"
      | "DELIVERED"
      | "CANCELLED";
  } & PagingInput) {
    const tracking = trackingSearchFilter(input.search);
    const and: Prisma.ConsolidationBatchWhereInput[] = [];
    if (input.status) and.push({ status: input.status });
    if (tracking) {
      and.push({
        OR: [
          { order: { is: { orderNumber: tracking } } },
          {
            outboundShipment: {
              is: { trackingRef: tracking },
            },
          },
          {
            inboundShipments: {
              some: { trackingRef: tracking },
            },
          },
        ],
      });
    }
    const where: Prisma.ConsolidationBatchWhereInput =
      and.length > 0 ? { AND: and } : {};
    const skip = (input.page - 1) * input.pageSize;

    const [total, rows] = await Promise.all([
      prisma.consolidationBatch.count({ where }),
      prisma.consolidationBatch.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          inboundShipments: {
            select: {
              id: true,
              orderVendorId: true,
              status: true,
            },
          },
          outboundShipment: {
            select: {
              id: true,
              status: true,
              trackingRef: true,
              consolidatedAt: true,
              shippedAt: true,
              deliveredAt: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take: input.pageSize,
      }),
    ]);

    return buildPagination(
      rows.map((row) => ({
        id: row.id,
        status: row.status,
        expectedVendorCount: row.expectedVendorCount,
        receivedVendorCount: row.receivedVendorCount,
        readyToConsolidateAt: row.readyToConsolidateAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        order: {
          id: row.order.id,
          orderNumber: row.order.orderNumber,
        },
        inboundShipments: row.inboundShipments.map((shipment) => ({
          id: shipment.id,
          orderVendorId: shipment.orderVendorId,
          status: shipment.status,
        })),
        outboundShipment: row.outboundShipment
          ? {
              id: row.outboundShipment.id,
              status: row.outboundShipment.status,
              trackingRef: row.outboundShipment.trackingRef,
              consolidatedAt: row.outboundShipment.consolidatedAt?.toISOString() ?? null,
              shippedAt: row.outboundShipment.shippedAt?.toISOString() ?? null,
              deliveredAt: row.outboundShipment.deliveredAt?.toISOString() ?? null,
            }
          : null,
      })),
      total,
      input.page,
      input.pageSize
    );
  }

  async listOutboundShipments(input: {
    status?: "CONSOLIDATED" | "OUTBOUND_SHIPPED" | "DELIVERED";
  } & PagingInput) {
    const tracking = trackingSearchFilter(input.search);
    const and: Prisma.ConsolidatedOutboundShipmentWhereInput[] = [];
    if (input.status) and.push({ status: input.status });
    if (tracking) {
      and.push({
        OR: [
          { trackingRef: tracking },
          { order: { is: { orderNumber: tracking } } },
        ],
      });
    }
    const where: Prisma.ConsolidatedOutboundShipmentWhereInput =
      and.length > 0 ? { AND: and } : {};
    const skip = (input.page - 1) * input.pageSize;

    const [total, rows] = await Promise.all([
      prisma.consolidatedOutboundShipment.count({ where }),
      prisma.consolidatedOutboundShipment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          consolidationBatch: {
            select: {
              id: true,
              status: true,
              expectedVendorCount: true,
              receivedVendorCount: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take: input.pageSize,
      }),
    ]);

    return buildPagination(
      rows.map((row) => ({
        id: row.id,
        status: row.status,
        trackingRef: row.trackingRef,
        consolidatedAt: row.consolidatedAt?.toISOString() ?? null,
        shippedAt: row.shippedAt?.toISOString() ?? null,
        deliveredAt: row.deliveredAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        order: {
          id: row.order.id,
          orderNumber: row.order.orderNumber,
        },
        consolidationBatch: {
          id: row.consolidationBatch.id,
          status: row.consolidationBatch.status,
          expectedVendorCount: row.consolidationBatch.expectedVendorCount,
          receivedVendorCount: row.consolidationBatch.receivedVendorCount,
        },
      })),
      total,
      input.page,
      input.pageSize
    );
  }
}
