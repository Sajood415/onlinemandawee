import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { CommissionLedgerRepository } from "@/repositories/commission-ledger.repository";
import {
  OrderRepository,
  type AdminOrderListFilters,
  type OrderWithAdminRelations,
} from "@/repositories/order.repository";

type CommissionRow = Awaited<
  ReturnType<CommissionLedgerRepository["findByOrderVendorIds"]>
>[number];

export class AdminOrderService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly commissionLedgerRepository = new CommissionLedgerRepository()
  ) {}

  async list(filters: AdminOrderListFilters) {
    const [total, orders] = await Promise.all([
      this.orderRepository.countForAdmin(filters),
      this.orderRepository.listForAdmin(filters),
    ]);

    const commissionByOrderVendorId = await this.loadCommissionMap(orders);

    return {
      items: orders.map((order) =>
        this.serializeListItem(order, commissionByOrderVendorId)
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
    return this.serializeDetail(order, commissionByOrderVendorId);
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

  private serializeListItem(
    order: OrderWithAdminRelations,
    commissionByOrderVendorId: Map<string, CommissionRow>
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
    }));

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
    };
  }

  private serializeDetail(
    order: OrderWithAdminRelations,
    commissionByOrderVendorId: Map<string, CommissionRow>
  ) {
    const vendorOrders = order.vendorOrders.map((vendorOrder) => {
      const commission = this.serializeCommission(
        vendorOrder.id,
        commissionByOrderVendorId
      );

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
    };
  }
}
