import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import {
  OrderRepository,
  type AdminOrderListFilters,
  type OrderWithAdminRelations,
} from "@/repositories/order.repository";
import { PayoutRepository } from "@/repositories/payout.repository";
import { RefundCaseRepository } from "@/repositories/refund-case.repository";
import { VendorLedgerEntryRepository } from "@/repositories/vendor-ledger-entry.repository";

type CommissionRow = Awaited<
  ReturnType<CommissionLedgerRepository["findByOrderVendorIds"]>
>[number];

type PayoutRow = Awaited<
  ReturnType<PayoutRepository["findByOrderVendorIds"]>
>[number];

type VendorLedgerRow = Awaited<
  ReturnType<VendorLedgerEntryRepository["listByOrderVendorIds"]>
>[number];

export class AdminOrderService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository(),
    private readonly payoutRepository = new PayoutRepository(),
    private readonly refundCaseRepository = new RefundCaseRepository(),
    private readonly vendorLedgerEntryRepository = new VendorLedgerEntryRepository()
  ) {}

  async list(filters: AdminOrderListFilters) {
    const [total, orders] = await Promise.all([
      this.orderRepository.countForAdmin(filters),
      this.orderRepository.listForAdmin(filters),
    ]);

    const commissionByOrderVendorId = await this.loadCommissionMap(orders);
    const payoutByOrderVendorId = await this.loadPayoutMap(orders);

    return {
      items: orders.map((order) =>
        this.serializeListItem(
          order,
          commissionByOrderVendorId,
          payoutByOrderVendorId
        )
      ),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
      },
    };
  }

  async detail(orderId: string) {
    const order = await this.orderRepository.findByIdForAdmin(orderId);

    if (!order) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    const commissionByOrderVendorId = await this.loadCommissionMap([order]);
    const payoutByOrderVendorId = await this.loadPayoutMap([order]);
    const vendorLedgerByOrderVendorId = await this.loadVendorLedgerMap([order]);
    const refundCases = await this.refundCaseRepository.listByOrderId(orderId);

    return {
      ...this.serializeDetail(
        order,
        commissionByOrderVendorId,
        payoutByOrderVendorId,
        vendorLedgerByOrderVendorId
      ),
      refundCases: refundCases.map((refundCase) => ({
        id: refundCase.id,
        orderItemId: refundCase.orderItemId,
        status: refundCase.status,
        reason: refundCase.reason,
        requestedAmount: refundCase.requestedAmount,
        createdAt: refundCase.createdAt.toISOString(),
        decision: refundCase.decision
          ? {
              decisionType: refundCase.decision.decisionType,
              approvedAmount: refundCase.decision.approvedAmount,
              reason: refundCase.decision.reason,
            }
          : null,
      })),
    };
  }

  private async loadPayoutMap(orders: OrderWithAdminRelations[]) {
    const orderVendorIds = orders.flatMap((order) =>
      order.vendorOrders.map((vendorOrder) => vendorOrder.id)
    );
    const rows = await this.payoutRepository.findByOrderVendorIds(orderVendorIds);
    return new Map(rows.map((row) => [row.orderVendorId, row]));
  }

  private async loadCommissionMap(orders: OrderWithAdminRelations[]) {
    const orderVendorIds = orders.flatMap((order) =>
      order.vendorOrders.map((vendorOrder) => vendorOrder.id)
    );
    const rows = await this.commissionLedgerRepository.findByOrderVendorIds(
      orderVendorIds
    );
    return new Map(rows.map((row) => [row.orderVendorId, row]));
  }

  private async loadVendorLedgerMap(orders: OrderWithAdminRelations[]) {
    const orderVendorIds = orders.flatMap((order) =>
      order.vendorOrders.map((vendorOrder) => vendorOrder.id)
    );
    const rows = await this.vendorLedgerEntryRepository.listByOrderVendorIds(orderVendorIds);
    const map = new Map<string, VendorLedgerRow[]>();

    for (const row of rows) {
      if (!row.orderVendorId) continue;
      const existing = map.get(row.orderVendorId) ?? [];
      existing.push(row);
      map.set(row.orderVendorId, existing);
    }

    return map;
  }

  private serializeCommission(
    vendorOrderId: string,
    commissionByOrderVendorId: Map<string, CommissionRow>
  ) {
    const row = commissionByOrderVendorId.get(vendorOrderId);
    if (!row) {
      return {
        rateBps: null,
        baseAmount: null,
        commissionAmount: null,
        currency: null,
      };
    }

    return {
      rateBps: row.rateBps,
      baseAmount: row.baseAmount,
      commissionAmount: row.commissionAmount,
      currency: row.currency,
    };
  }

  private serializePayout(
    vendorOrderId: string,
    payoutByOrderVendorId: Map<string, PayoutRow>
  ) {
    const row = payoutByOrderVendorId.get(vendorOrderId);
    if (!row) {
      return {
        status: null,
        amount: null,
        currency: null,
        holdUntil: null,
        releasedAt: null,
        sentAt: null,
      };
    }

    return {
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      holdUntil: row.holdUntil.toISOString(),
      releasedAt: row.releasedAt?.toISOString() ?? null,
      sentAt: row.sentAt?.toISOString() ?? null,
    };
  }

  private serializeListItem(
    order: OrderWithAdminRelations,
    commissionByOrderVendorId: Map<string, CommissionRow>,
    payoutByOrderVendorId: Map<string, PayoutRow>
  ) {
    const vendorSummaries = order.vendorOrders.map((vendorOrder) => ({
      id: vendorOrder.id,
      vendorProfileId: vendorOrder.vendorProfileId,
      vendorStoreName: vendorOrder.vendorProfile.storeName,
      vendorStoreSlug: vendorOrder.vendorProfile.storeSlug,
      status: vendorOrder.status,
      grandTotalAmount: vendorOrder.grandTotalAmount,
      currency: vendorOrder.currency,
      commissionAmount:
        commissionByOrderVendorId.get(vendorOrder.id)?.commissionAmount ?? null,
      payout: this.serializePayout(vendorOrder.id, payoutByOrderVendorId),
      items: vendorOrder.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
      })),
    }));

    const allItems = vendorSummaries.flatMap((vendor) => vendor.items);

    const totalCommissionAmount = vendorSummaries.reduce((sum, vendorOrder) => {
      return sum + (vendorOrder.commissionAmount ?? 0);
    }, 0);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      grandTotalAmount: order.grandTotalAmount,
      createdAt: order.createdAt.toISOString(),
      customer: order.user
        ? {
            id: order.user.id,
            fullName: order.user.fullName,
            email: order.user.email,
            phone: order.user.phone,
          }
        : null,
      guestEmail: order.guestEmail ?? null,
      shippingContact: {
        fullName: order.shippingFullName,
        phone: order.shippingPhone,
      },
      vendorCount: order.vendorOrders.length,
      vendorFulfillmentStatuses: order.vendorOrders.map(
        (vendorOrder) => vendorOrder.status
      ),
      vendors: vendorSummaries,
      totalCommissionAmount,
      itemCount: allItems.reduce((sum, item) => sum + item.quantity, 0),
      lineItemCount: allItems.length,
      itemsPreview: allItems.slice(0, 3).map((item) => item.productName),
    };
  }

  private serializeDetail(
    order: OrderWithAdminRelations,
    commissionByOrderVendorId: Map<string, CommissionRow>,
    payoutByOrderVendorId: Map<string, PayoutRow>,
    vendorLedgerByOrderVendorId: Map<string, VendorLedgerRow[]>
  ) {
    const vendorOrders = order.vendorOrders.map((vendorOrder) => {
      const commission = this.serializeCommission(
        vendorOrder.id,
        commissionByOrderVendorId
      );
      const payout = this.serializePayout(vendorOrder.id, payoutByOrderVendorId);

      return {
        id: vendorOrder.id,
        vendorProfileId: vendorOrder.vendorProfileId,
        vendorStoreSlug: vendorOrder.vendorProfile.storeSlug,
        vendorStoreName: vendorOrder.vendorProfile.storeName,
        status: vendorOrder.status,
        deliveredAt: vendorOrder.deliveredAt?.toISOString() ?? null,
        currency: vendorOrder.currency,
        subtotalAmount: vendorOrder.subtotalAmount,
        deliveryAmount: vendorOrder.deliveryAmount,
        discountAmount: vendorOrder.discountAmount,
        grandTotalAmount: vendorOrder.grandTotalAmount,
        couponCode: vendorOrder.couponCode,
        commission,
        payout,
        vendorLedgerEntries: (vendorLedgerByOrderVendorId.get(vendorOrder.id) ?? []).map(
          (entry) => ({
            id: entry.id,
            bucket: entry.bucket,
            entryType: entry.entryType,
            amount: entry.amount,
            currency: entry.currency,
            description: entry.description,
            createdAt: entry.createdAt.toISOString(),
          })
        ),
        items: vendorOrder.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          productSku: item.productSku,
          quantity: item.quantity,
          currency: item.currency,
          unitPriceAmount: item.unitPriceAmount,
          lineTotalAmount: item.lineTotalAmount,
        })),
      };
    });

    const totalCommissionAmount = vendorOrders.reduce((sum, vendorOrder) => {
      return sum + (vendorOrder.commission.commissionAmount ?? 0);
    }, 0);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      subtotalAmount: order.subtotalAmount,
      deliveryAmount: order.deliveryAmount,
      discountAmount: order.discountAmount,
      grandTotalAmount: order.grandTotalAmount,
      stripePaymentIntentId: order.stripePaymentIntentId,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      customer: order.user
        ? {
            id: order.user.id,
            fullName: order.user.fullName,
            email: order.user.email,
            phone: order.user.phone,
          }
        : null,
      guestEmail: order.guestEmail ?? null,
      shippingAddress: {
        fullName: order.shippingFullName,
        phone: order.shippingPhone,
        addressLine1: order.shippingAddressLine1,
        city: order.shippingCity,
        country: order.shippingCountry,
        postalCode: order.shippingPostalCode,
      },
      vendorOrders,
      totalCommissionAmount,
      warehouse: {
        inboundShipments:
          order.consolidationBatch?.inboundShipments.map((shipment) => ({
            id: shipment.id,
            orderVendorId: shipment.orderVendorId,
            vendorProfileId: shipment.orderVendor.vendorProfileId,
            vendorStoreName: shipment.orderVendor.vendorProfile.storeName,
            vendorStoreSlug: shipment.orderVendor.vendorProfile.storeSlug,
            status: shipment.status,
            trackingRef: shipment.trackingRef,
            shippedAt: shipment.shippedAt?.toISOString() ?? null,
            receivedAt: shipment.receivedAt?.toISOString() ?? null,
            createdAt: shipment.createdAt.toISOString(),
            updatedAt: shipment.updatedAt.toISOString(),
          })) ?? [],
        batch: order.consolidationBatch
          ? {
              id: order.consolidationBatch.id,
              status: order.consolidationBatch.status,
              expectedVendorCount: order.consolidationBatch.expectedVendorCount,
              receivedVendorCount: order.consolidationBatch.receivedVendorCount,
              readyToConsolidateAt:
                order.consolidationBatch.readyToConsolidateAt?.toISOString() ?? null,
              createdAt: order.consolidationBatch.createdAt.toISOString(),
              updatedAt: order.consolidationBatch.updatedAt.toISOString(),
            }
          : null,
        outboundShipment: order.outboundShipment
          ? {
              id: order.outboundShipment.id,
              status: order.outboundShipment.status,
              trackingRef: order.outboundShipment.trackingRef,
              consolidatedAt: order.outboundShipment.consolidatedAt?.toISOString() ?? null,
              shippedAt: order.outboundShipment.shippedAt?.toISOString() ?? null,
              deliveredAt: order.outboundShipment.deliveredAt?.toISOString() ?? null,
              createdAt: order.outboundShipment.createdAt.toISOString(),
              updatedAt: order.outboundShipment.updatedAt.toISOString(),
            }
          : null,
      },
    };
  }
}
