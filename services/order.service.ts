import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { VendorOrderStatus } from "@/domain/order/order-status";
import { env } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import {
  buildOrderCancelledEmail,
  buildOrderDeliveredEmail,
  buildOrderPickupReadyEmail,
  buildOrderShippedEmail,
} from "@/lib/mail/order-status-email";
import { sendTransactionalEmail } from "@/lib/mail/send-transactional-email";
import { sendVendorOrderNotifications } from "@/lib/mail/send-vendor-order-notifications";
import { generateOpaqueToken } from "@/lib/utils/crypto";
import { normalizeEmailForAuth } from "@/lib/utils/normalize-email";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { CartItemRepository } from "@/repositories/cart-item.repository";
import { CartRepository } from "@/repositories/cart.repository";
import { CustomerAddressRepository } from "@/repositories/customer-address.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { buildGuestOrderTrackingUrl } from "@/lib/orders/build-order-tracking-url";
import { resolveDistanceDeliveryQuote } from "@/lib/delivery/resolve-distance-delivery";
import { resolveVendorSettlementDeliveryAmount } from "@/lib/delivery/vendor-settlement-delivery";
import { getRefundEligibility } from "@/lib/refunds/refund-eligibility";
import { StandardConsolidationService } from "@/services/standard-consolidation.service";
import { PayoutReleaseService } from "@/services/payout-release.service";
import { mergeLineItemsByProduct } from "@/lib/orders/aggregate-order-line-items";
import {
  canCustomerCancelBeforeShipping,
  getCustomerCancellationState,
  isOrderLockedByCustomerCancellation,
} from "@/lib/orders/order-cancellation";
import { executeOrderCancellation } from "@/lib/orders/execute-order-cancellation";
import { OrderCancelRefundService } from "@/services/order-cancel-refund.service";

type QuoteLine = {
  cartItemId: string;
  productId: string;
  vendorProfileId: string;
  categoryId: string;
  vendorStoreSlug: string | null;
  vendorStoreName: string | null;
  quantity: number;
  snapshotCurrency: string;
  snapshotUnitPrice: number;
  snapshotLineTotal: number;
  currentCurrency: string;
  currentUnitPrice: number;
  currentLineTotal: number;
  productName: string;
  productImage: string | null;
  productSku: string | null;
  snapshotChanged: boolean;
  isAvailable: boolean;
};

type QuoteResult = {
  currency: string;
  deliveryMethod: "PICKUP" | "EXPRESS" | "STANDARD";
  address: {
    id: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
  };
  subtotalSnapshot: number;
  subtotalCurrent: number;
  deliveryTotal: number;
  discountTotal: number;
  grandTotalSnapshot: number;
  grandTotalCurrent: number;
  hasSnapshotChanges: boolean;
  deliveryBreakdown?: Array<{
    vendorProfileId: string;
    vendorStoreName: string | null;
    distanceKm: number;
    baseFeeAmount: number;
    perKmRateAmount: number;
    deliveryAmount: number;
  }>;
  vendorGroups: Array<{
    vendorProfileId: string;
    vendorStoreSlug: string | null;
    vendorStoreName: string | null;
    sellerType: "PLATFORM" | "THIRD_PARTY";
    subtotalSnapshot: number;
    subtotalCurrent: number;
    deliveryAmount: number;
    items: QuoteLine[];
  }>;
};

export class OrderService {
  private static readonly PICKUP_READY_EMAIL_AUDIT_ACTION = "order.pickup_ready_email_sent";

  constructor(
    private readonly cartRepository = new CartRepository(),
    private readonly cartItemRepository = new CartItemRepository(),
    private readonly customerAddressRepository = new CustomerAddressRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly auditLogRepository = new AuditLogRepository(),
    private readonly standardConsolidationService = new StandardConsolidationService(),
    private readonly payoutReleaseService = new PayoutReleaseService(),
    private readonly orderCancelRefundService = new OrderCancelRefundService()
  ) {}

  async createOrder(
    auth: AuthenticatedUser,
    input: {
      addressId: string;
      method: "PICKUP" | "EXPRESS" | "STANDARD";
      currency?: string;
      distanceKm?: number;
    }
  ) {
    this.assertActiveCustomer(auth);
    const quote = await this.buildQuote(auth, input);
    const orderNumber = await this.generateUniqueOrderNumber();

    const order = await this.orderRepository.create({
      userId: auth.id,
      orderNumber,
      deliveryMethod: input.method,
      currency: quote.currency,
      subtotalAmount: quote.subtotalCurrent,
      deliveryAmount: quote.deliveryTotal,
      discountAmount: quote.discountTotal,
      grandTotalAmount: quote.grandTotalCurrent,
      shippingFullName: quote.address.fullName,
      shippingPhone: quote.address.phone,
      shippingAddressLine1: quote.address.addressLine1,
      shippingCity: quote.address.city,
      shippingCountry: quote.address.country,
      shippingPostalCode: quote.address.postalCode,
      vendorOrders: quote.vendorGroups.map((vendorGroup) => {
        const deliveryAmount = resolveVendorSettlementDeliveryAmount({
          deliveryMethod: input.method,
          quotedDeliveryAmount: vendorGroup.deliveryAmount,
          sellerType: vendorGroup.sellerType,
        });
        return {
          vendorProfileId: vendorGroup.vendorProfileId,
          deliveryMethod: input.method,
          currency: quote.currency,
          subtotalAmount: vendorGroup.subtotalCurrent,
          deliveryAmount,
          discountAmount: 0,
          grandTotalAmount: vendorGroup.subtotalCurrent + deliveryAmount,
          items: mergeLineItemsByProduct(
            vendorGroup.items.map((item) => ({
              productId: item.productId,
              variantId: null,
              productName: item.productName,
              quantity: item.quantity,
              unitPriceAmount: item.currentUnitPrice,
              lineTotalAmount: item.currentLineTotal,
              productImage: item.productImage,
              productSku: item.productSku,
              vendorProfileId: item.vendorProfileId,
              categoryId: item.categoryId,
            }))
          ).map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            currency: quote.currency,
            unitPriceAmount: item.unitPriceAmount,
            lineTotalAmount: item.lineTotalAmount,
            productName: item.productName,
            productImage: item.productImage as string | null,
            productSku: item.productSku,
            vendorProfileId: item.vendorProfileId as string,
            categoryId: item.categoryId as string,
          })),
        };
      }),
    });

    await this.standardConsolidationService.initializeForOrder(order.id);

    const cart = await this.cartRepository.findByUserId(auth.id);

    if (cart) {
      await this.cartItemRepository.deleteManyByCartId(cart.id);
    }

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "order.created",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        orderNumber,
      },
    });

    await sendVendorOrderNotifications({
      orderNumber: order.orderNumber,
      customerName: order.shippingFullName,
      customerEmail: auth.email,
      customerPhone: order.shippingPhone,
      currency: order.currency,
      paymentMethod: "card",
      paymentStatus: order.paymentStatus === "PAID" ? "PAID" : "UNPAID",
      shippingAddress: {
        addressLine1: order.shippingAddressLine1,
        city: order.shippingCity,
        country: order.shippingCountry,
        postalCode: order.shippingPostalCode || undefined,
        phone: order.shippingPhone || undefined,
      },
      vendorGroups: order.vendorOrders.map((vendorOrder) => ({
        vendorProfileId: vendorOrder.vendorProfileId,
        grandTotalAmount: vendorOrder.grandTotalAmount,
        deliveryMethod: vendorOrder.deliveryMethod,
        items: vendorOrder.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPriceAmount: item.unitPriceAmount,
          currency: item.currency,
        })),
      })),
    });

    return this.getOrderForCustomer(auth, order.id);
  }

  async listMyOrders(auth: AuthenticatedUser) {
    this.assertActiveCustomer(auth);
    await this.orderRepository.claimGuestOrdersForUser(auth.id, auth.email);
    await this.orderRepository.backfillMissingDeliveredAtForUser(auth.id);
    const orders = await this.orderRepository.listByUserId(auth.id);
    return orders.map((order) => this.serializeOrder(order));
  }

  async getOrderForCustomer(auth: AuthenticatedUser, orderId: string) {
    this.assertActiveCustomer(auth);
    await this.orderRepository.claimGuestOrdersForUser(auth.id, auth.email);
    await this.orderRepository.backfillMissingDeliveredAtForUser(auth.id);
    const order = await this.orderRepository.findById(orderId);

    if (!order || !this.customerOwnsOrder(auth, order)) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    return this.serializeOrder(order);
  }

  async cancelMyOrder(
    auth: AuthenticatedUser,
    orderId: string,
    input: { reason?: string }
  ) {
    this.assertActiveCustomer(auth);
    await this.orderRepository.claimGuestOrdersForUser(auth.id, auth.email);

    const order = await this.orderRepository.findById(orderId);

    if (!order || !this.customerOwnsOrder(auth, order)) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    const eligibility = canCustomerCancelBeforeShipping({
      orderStatus: order.status,
      vendorOrders: order.vendorOrders.map((vendorOrder) => ({
        status: vendorOrder.status,
        inboundShipmentStatus: vendorOrder.inboundShipment?.status ?? null,
      })),
    });

    if (!eligibility.eligible) {
      const message =
        eligibility.reason === "ORDER_ALREADY_CANCELLED"
          ? "This order has already been cancelled."
          : "This order can no longer be cancelled because it has already been shipped.";
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message,
        statusCode: 409,
      });
    }

    const customerEmail =
      order.user?.email ?? order.guestEmail ?? auth.email;

    const refund = await this.orderCancelRefundService.refundBeforeCancel({
      orderId: order.id,
      mode: "full",
      actor: "CUSTOMER",
    });

    const result = await executeOrderCancellation({
      orderId: order.id,
      cancelledByRole: "CUSTOMER",
      cancelledByUserId: auth.id,
      cancellationReason: input.reason,
      notifyEmail: customerEmail,
      refundedAmount: refund.refundedAmount,
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "customer.order_cancelled",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        reason: input.reason?.trim() || null,
        cancelledAt: result.cancelledAt,
        refundedAmount: refund.refundedAmount,
        paymentStatus: refund.paymentStatus,
        stripeRefundId: refund.stripeRefundId,
      },
    });

    return this.getOrderForCustomer(auth, order.id);
  }

  async listVendorOrders(auth: AuthenticatedUser) {
    const vendor = await this.requireActiveVendor(auth.id);
    const vendorOrders = await this.orderRepository.listByVendorProfileId(vendor.id);

    return vendorOrders.map((vendorOrder) => ({
      id: vendorOrder.id,
      status: vendorOrder.status,
      sellerType: vendorOrder.vendorProfile.sellerType,
      deliveryMethod: vendorOrder.deliveryMethod,
      currency: vendorOrder.currency,
      subtotalAmount: vendorOrder.subtotalAmount,
      deliveryAmount: vendorOrder.deliveryAmount,
      discountAmount: vendorOrder.discountAmount,
      grandTotalAmount: vendorOrder.grandTotalAmount,
      deliveredAt: vendorOrder.deliveredAt?.toISOString() ?? null,
      createdAt: vendorOrder.createdAt.toISOString(),
      updatedAt: vendorOrder.updatedAt.toISOString(),
      order: {
        id: vendorOrder.order.id,
        orderNumber: vendorOrder.order.orderNumber,
        status: vendorOrder.order.status,
        paymentStatus: vendorOrder.order.paymentStatus,
        shippingFullName: vendorOrder.order.shippingFullName,
        shippingPhone: vendorOrder.order.shippingPhone,
        shippingAddressLine1: vendorOrder.order.shippingAddressLine1,
        shippingCity: vendorOrder.order.shippingCity,
        shippingCountry: vendorOrder.order.shippingCountry,
        shippingPostalCode: vendorOrder.order.shippingPostalCode,
        cancelledAt: vendorOrder.order.cancelledAt?.toISOString() ?? null,
        cancellationReason: vendorOrder.order.cancellationReason ?? null,
        cancelledByRole: vendorOrder.order.cancelledByRole ?? null,
      },
      warehouse: {
        inboundShipment: vendorOrder.inboundShipment
          ? {
              id: vendorOrder.inboundShipment.id,
              status: vendorOrder.inboundShipment.status,
              trackingRef: vendorOrder.inboundShipment.trackingRef,
              shippedAt: vendorOrder.inboundShipment.shippedAt?.toISOString() ?? null,
              receivedAt: vendorOrder.inboundShipment.receivedAt?.toISOString() ?? null,
              createdAt: vendorOrder.inboundShipment.createdAt.toISOString(),
              updatedAt: vendorOrder.inboundShipment.updatedAt.toISOString(),
            }
          : null,
        batch: vendorOrder.order.consolidationBatch
          ? {
              id: vendorOrder.order.consolidationBatch.id,
              status: vendorOrder.order.consolidationBatch.status,
              expectedVendorCount: vendorOrder.order.consolidationBatch.expectedVendorCount,
              receivedVendorCount: vendorOrder.order.consolidationBatch.receivedVendorCount,
              readyToConsolidateAt:
                vendorOrder.order.consolidationBatch.readyToConsolidateAt?.toISOString() ?? null,
              createdAt: vendorOrder.order.consolidationBatch.createdAt.toISOString(),
              updatedAt: vendorOrder.order.consolidationBatch.updatedAt.toISOString(),
            }
          : null,
        outboundShipment: vendorOrder.order.outboundShipment
          ? {
              id: vendorOrder.order.outboundShipment.id,
              status: vendorOrder.order.outboundShipment.status,
              trackingRef: vendorOrder.order.outboundShipment.trackingRef,
              consolidatedAt: vendorOrder.order.outboundShipment.consolidatedAt?.toISOString() ?? null,
              shippedAt: vendorOrder.order.outboundShipment.shippedAt?.toISOString() ?? null,
              deliveredAt: vendorOrder.order.outboundShipment.deliveredAt?.toISOString() ?? null,
              createdAt: vendorOrder.order.outboundShipment.createdAt.toISOString(),
              updatedAt: vendorOrder.order.outboundShipment.updatedAt.toISOString(),
            }
          : null,
      },
      items: vendorOrder.items,
    }));
  }

  async updateVendorOrderStatus(
    auth: AuthenticatedUser,
    vendorOrderId: string,
    status: VendorOrderStatus
  ) {
    const vendor = await this.requireActiveVendor(auth.id);
    const vendorOrder = await this.orderRepository.findVendorOrderById(vendorOrderId);

    if (!vendorOrder || vendorOrder.vendorProfileId !== vendor.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor order not found",
        statusCode: 404,
      });
    }

    const parentOrder = vendorOrder.order;
    if (
      parentOrder.status === "CANCELLED" ||
      isOrderLockedByCustomerCancellation(parentOrder.cancelledByRole)
    ) {
      throw new AppError({
        code: ERROR_CODE.CONFLICT,
        message: "This order was cancelled by the customer and cannot be updated.",
        statusCode: 409,
      });
    }

    this.assertVendorOrderTransition(vendorOrder.status, status);

    let cancelRefund: Awaited<
      ReturnType<OrderCancelRefundService["refundBeforeCancel"]>
    > | null = null;

    if (status === "CANCELLED") {
      cancelRefund = await this.orderCancelRefundService.refundBeforeCancel({
        orderId: parentOrder.id,
        mode: "vendor",
        vendorOrderId,
        actor: "VENDOR",
      });
    }

    const updatedVendorOrder = await this.orderRepository.updateVendorOrderStatus(
      vendorOrderId,
      status
    );
    const overallStatus = await this.recalculateOrderStatus(updatedVendorOrder.orderId);

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "vendor.order_status_updated",
      entityType: "OrderVendor",
      entityId: updatedVendorOrder.id,
      metadata: {
        status,
        orderStatus: overallStatus,
        ...(status === "DELIVERED" && updatedVendorOrder.deliveredAt
          ? { deliveredAt: updatedVendorOrder.deliveredAt.toISOString() }
          : {}),
        ...(cancelRefund
          ? {
              refundedAmount: cancelRefund.refundedAmount,
              paymentStatus: cancelRefund.paymentStatus,
              stripeRefundId: cancelRefund.stripeRefundId,
            }
          : {}),
      },
    });

    if (status === "DELIVERED" && updatedVendorOrder.deliveredAt) {
      await this.payoutReleaseService.syncExpressHoldOnDelivery({
        orderVendorId: updatedVendorOrder.id,
        deliveredAt: updatedVendorOrder.deliveredAt,
      });
    }

    // Send email notification to customer on key status changes
    if (status === "SHIPPED" || status === "DELIVERED" || status === "CANCELLED") {
      await this.sendOrderStatusEmail({
        orderId: vendorOrder.order.id,
        status,
        vendorOrderId: vendorOrder.id,
        refundedAmount: cancelRefund?.refundedAmount,
      });
    }

    return {
      id: updatedVendorOrder.id,
      status: updatedVendorOrder.status,
      orderId: updatedVendorOrder.orderId,
      orderStatus: overallStatus,
    };
  }

  async listAllOrders() {
    const orders = await this.orderRepository.listAll();
    return orders.map((order) => this.serializeOrder(order));
  }

  private async buildQuote(
    auth: AuthenticatedUser,
    input: {
      addressId: string;
      method: "PICKUP" | "EXPRESS" | "STANDARD";
      currency?: string;
      distanceKm?: number;
    }
  ): Promise<QuoteResult> {
    const cart = await this.cartRepository.findByUserId(auth.id);

    if (!cart || cart.items.length === 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Cart is empty",
        statusCode: 400,
      });
    }

    const address = await this.customerAddressRepository.findById(input.addressId);

    if (!address || address.userId !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Address not found",
        statusCode: 404,
      });
    }

    const currency = input.currency ?? cart.currency;

    const items = cart.items.map((item) => {
      const currentUnitPrice = item.product.priceAmount;
      const snapshotLineTotal = item.unitPriceSnapshot * item.quantity;
      const currentLineTotal = currentUnitPrice * item.quantity;
      const isAvailable =
        item.product.approvalStatus === "APPROVED" &&
        item.product.isActive &&
        item.product.vendorProfile.status === "ACTIVE" &&
        item.product.stockQty >= item.quantity;

      return {
        cartItemId: item.id,
        productId: item.productId,
        vendorProfileId: item.vendorProfileId,
        categoryId: item.product.categoryId,
        vendorStoreSlug: item.product.vendorProfile.storeSlug,
        vendorStoreName: item.product.vendorProfile.storeName,
        quantity: item.quantity,
        snapshotCurrency: item.currencySnapshot,
        snapshotUnitPrice: item.unitPriceSnapshot,
        snapshotLineTotal,
        currentCurrency: item.product.currency,
        currentUnitPrice,
        currentLineTotal,
        productName: item.product.name,
        productImage: item.product.images[0] ?? null,
        productSku: item.product.sku ?? null,
        snapshotChanged:
          item.currencySnapshot !== item.product.currency ||
          item.unitPriceSnapshot !== currentUnitPrice ||
          item.productNameSnapshot !== item.product.name,
        isAvailable,
      };
    });

    const invalidItems = items.filter((item) => !item.isAvailable);

    if (invalidItems.length > 0) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Some cart items are no longer available",
        statusCode: 400,
        details: {
          invalidItemIds: invalidItems.map((item) => item.cartItemId),
        },
      });
    }

    const sellerTypeByVendor = new Map(
      cart.items.map((item) => [
        item.vendorProfileId,
        (item.product.vendorProfile.sellerType ?? "THIRD_PARTY") as
          | "PLATFORM"
          | "THIRD_PARTY",
      ])
    );

    const vendorGroups = Object.values(
      items.reduce<Record<string, QuoteResult["vendorGroups"][number]>>(
        (accumulator, item) => {
          const key = item.vendorProfileId;

          if (!accumulator[key]) {
            accumulator[key] = {
              vendorProfileId: item.vendorProfileId,
              vendorStoreSlug: item.vendorStoreSlug ?? null,
              vendorStoreName: item.vendorStoreName ?? null,
              sellerType: sellerTypeByVendor.get(item.vendorProfileId) ?? "THIRD_PARTY",
              subtotalSnapshot: 0,
              subtotalCurrent: 0,
              deliveryAmount: 0,
              items: [],
            };
          }

          accumulator[key].subtotalSnapshot += item.snapshotLineTotal;
          accumulator[key].subtotalCurrent += item.currentLineTotal;
          accumulator[key].items.push(item);

          return accumulator;
        },
        {}
      )
    );

    const subtotalSnapshot = items.reduce(
      (sum, item) => sum + item.snapshotLineTotal,
      0
    );
    const subtotalCurrent = items.reduce(
      (sum, item) => sum + item.currentLineTotal,
      0
    );
    const deliveryQuote =
      input.method === "PICKUP"
        ? null
        : await resolveDistanceDeliveryQuote({
            vendorProfileIds: [...new Set(items.map((item) => item.vendorProfileId))],
            deliveryAddress: {
              addressLine1: address.addressLine1,
              city: address.city,
              country: address.country,
              postalCode: address.postalCode,
            },
          });
    const deliveryTotal = deliveryQuote?.totalAmount ?? 0;

    return {
      currency,
      deliveryMethod: input.method,
      address: {
        id: address.id,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        city: address.city,
        country: address.country,
        postalCode: address.postalCode,
      },
      subtotalSnapshot,
      subtotalCurrent,
      deliveryTotal,
      discountTotal: 0,
      grandTotalSnapshot: subtotalSnapshot + deliveryTotal,
      grandTotalCurrent: subtotalCurrent + deliveryTotal,
      hasSnapshotChanges: items.some((item) => item.snapshotChanged),
      deliveryBreakdown: deliveryQuote?.breakdown,
      vendorGroups: vendorGroups.map((vendorGroup) => ({
        ...vendorGroup,
        deliveryAmount: resolveVendorSettlementDeliveryAmount({
          deliveryMethod: input.method,
          quotedDeliveryAmount:
            deliveryQuote?.breakdown.find(
              (entry) => entry.vendorProfileId === vendorGroup.vendorProfileId
            )?.deliveryAmount ?? 0,
          sellerType: vendorGroup.sellerType,
        }),
      })),
    };
  }

  private async generateUniqueOrderNumber() {
    while (true) {
      const candidate = `OM-${generateOpaqueToken().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
      const existing = await this.orderRepository.findByOrderNumber(candidate);

      if (!existing) {
        return candidate;
      }
    }
  }

  private async requireActiveVendor(userId: string) {
    const vendor = await this.vendorProfileRepository.findByUserId(userId);

    if (!vendor) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Vendor profile not found",
        statusCode: 404,
      });
    }

    if (vendor.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active vendors can manage orders",
        statusCode: 403,
      });
    }

    return vendor;
  }

  private async sendOrderStatusEmail(input: {
    orderId: string;
    status: VendorOrderStatus;
    vendorOrderId?: string;
    refundedAmount?: number;
  }) {
    try {
      const order = await this.orderRepository.findById(input.orderId);
      if (!order) return;

      const customerEmail = order.guestEmail ?? order.user?.email;
      const customerName = order.shippingFullName;
      if (!customerEmail) return;

      const trackingUrl =
        order.guestTrackingToken && order.guestEmail
          ? buildGuestOrderTrackingUrl(order.guestTrackingToken)
          : undefined;

      const ctx = {
        customerName,
        orderNumber: order.orderNumber,
        trackingUrl,
        grandTotalAmount: order.grandTotalAmount,
        currency: order.currency,
        shippingAddress: {
          addressLine1: order.shippingAddressLine1,
          city: order.shippingCity,
          country: order.shippingCountry,
          postalCode: order.shippingPostalCode || undefined,
          phone: order.shippingPhone || undefined,
        },
        items: order.vendorOrders.flatMap((vo) =>
          vo.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPriceAmount: item.unitPriceAmount,
            currency: item.currency,
          }))
        ),
      };

      let emailPayload: { subject: string; html: string; text: string };
      if (input.status === "SHIPPED") {
        const updatedVendorOrder = input.vendorOrderId
          ? order.vendorOrders.find((vendorOrder) => vendorOrder.id === input.vendorOrderId)
          : undefined;
        const isPickupReady = updatedVendorOrder?.deliveryMethod === "PICKUP";

        if (isPickupReady && input.vendorOrderId) {
          const alreadySent = await this.auditLogRepository.findLatestByEntityAndAction({
            entityType: "OrderVendor",
            entityId: input.vendorOrderId,
            action: OrderService.PICKUP_READY_EMAIL_AUDIT_ACTION,
          });

          if (alreadySent) return;

          const vendorProfile = await this.vendorProfileRepository.findById(
            updatedVendorOrder.vendorProfileId
          );
          const pickupAddress = vendorProfile?.address
            ? [
                vendorProfile.address.addressLine1,
                vendorProfile.address.city,
                vendorProfile.address.postalCode,
                vendorProfile.address.country,
              ]
                .filter(Boolean)
                .join(", ")
            : null;

          emailPayload = buildOrderPickupReadyEmail(ctx, {
            storeName: updatedVendorOrder.vendorProfile.storeName,
            pickupAddress,
          });
          await sendTransactionalEmail({ to: customerEmail, ...emailPayload });
          await this.auditLogRepository.create({
            action: OrderService.PICKUP_READY_EMAIL_AUDIT_ACTION,
            entityType: "OrderVendor",
            entityId: input.vendorOrderId,
            metadata: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              status: input.status,
            },
          });
          return;
        }

        emailPayload = buildOrderShippedEmail(ctx);
      } else if (input.status === "DELIVERED") {
        emailPayload = buildOrderDeliveredEmail(ctx);
      } else {
        const activeVendorOrders = order.vendorOrders.filter(
          (row) => row.status !== "CANCELLED"
        );
        const partialCancel =
          Boolean(input.vendorOrderId) && activeVendorOrders.length > 0;
        emailPayload = buildOrderCancelledEmail(ctx, {
          refundedAmount: input.refundedAmount ?? 0,
          partial: partialCancel,
        });
      }

      await sendTransactionalEmail({ to: customerEmail, ...emailPayload });
    } catch {
      // Email failures must not block the status update
    }
  }

  private assertActiveCustomer(auth: AuthenticatedUser) {
    if (auth.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active customers can manage orders",
        statusCode: 403,
      });
    }
  }

  private assertVendorOrderTransition(
    currentStatus: VendorOrderStatus,
    nextStatus: VendorOrderStatus
  ) {
    const allowedTransitions: Record<VendorOrderStatus, VendorOrderStatus[]> = {
      NEW: ["PREPARING", "CANCELLED"],
      PREPARING: ["SHIPPED", "CANCELLED"],
      INBOUND_SHIPPED: [],
      RECEIVED_AT_WAREHOUSE: [],
      SHIPPED: ["DELIVERED"],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: `Invalid vendor order status transition from ${currentStatus} to ${nextStatus}`,
        statusCode: 400,
      });
    }
  }

  private async recalculateOrderStatus(orderId: string) {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    const vendorStatuses = order.vendorOrders.map((vendorOrder) => vendorOrder.status);

    let nextStatus:
      | "CREATED"
      | "PAID"
      | "PARTIALLY_FULFILLED"
      | "FULFILLED"
      | "CANCELLED";

    if (vendorStatuses.every((status) => status === "CANCELLED")) {
      nextStatus = "CANCELLED";
    } else if (vendorStatuses.every((status) => status === "DELIVERED")) {
      nextStatus = "FULFILLED";
    } else if (
      vendorStatuses.some(
        (status) =>
          status === "INBOUND_SHIPPED" ||
          status === "RECEIVED_AT_WAREHOUSE" ||
          status === "SHIPPED" ||
          status === "DELIVERED"
      ) ||
      vendorStatuses.some((status) => status === "PREPARING")
    ) {
      nextStatus = "PARTIALLY_FULFILLED";
    } else if (order.paymentStatus === "PAID") {
      nextStatus = "PAID";
    } else {
      nextStatus = "CREATED";
    }

    const updatedOrder = await this.orderRepository.updateOrderStatus(orderId, nextStatus);
    return updatedOrder.status;
  }

  private customerOwnsOrder(
    auth: AuthenticatedUser,
    order: NonNullable<Awaited<ReturnType<OrderRepository["findById"]>>>
  ) {
    if (order.userId === auth.id) {
      return true;
    }

    if (!order.guestEmail) {
      return false;
    }

    return normalizeEmailForAuth(order.guestEmail) === normalizeEmailForAuth(auth.email);
  }

  private serializeOrder(order: Awaited<ReturnType<OrderRepository["findById"]>> extends infer T ? NonNullable<T> : never) {
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
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      shippingAddress: {
        fullName: order.shippingFullName,
        phone: order.shippingPhone,
        addressLine1: order.shippingAddressLine1,
        city: order.shippingCity,
        country: order.shippingCountry,
        postalCode: order.shippingPostalCode,
      },
      cancellation: getCustomerCancellationState({
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancellationReason,
        cancelledByRole: order.cancelledByRole,
        vendorOrders: order.vendorOrders.map((vendorOrder) => ({
          status: vendorOrder.status,
          inboundShipmentStatus: vendorOrder.inboundShipment?.status ?? null,
        })),
      }),
      customer: order.user
        ? {
            id: order.user.id,
            fullName: order.user.fullName,
            email: order.user.email,
            phone: order.user.phone,
          }
        : null,
      vendorOrders: order.vendorOrders.map((vendorOrder) => ({
        id: vendorOrder.id,
        vendorProfileId: vendorOrder.vendorProfileId,
        vendorStoreSlug: vendorOrder.vendorProfile.storeSlug,
        vendorStoreName: vendorOrder.vendorProfile.storeName,
        deliveryMethod: vendorOrder.deliveryMethod,
        vendorUser: "user" in vendorOrder.vendorProfile
          ? {
              id: vendorOrder.vendorProfile.user.id,
              fullName: vendorOrder.vendorProfile.user.fullName,
              email: vendorOrder.vendorProfile.user.email,
              phone: vendorOrder.vendorProfile.user.phone,
            }
          : null,
        status: vendorOrder.status,
        deliveredAt: vendorOrder.deliveredAt?.toISOString() ?? null,
        refundEligibility: getRefundEligibility({
          vendorOrderStatus: vendorOrder.status,
          deliveredAt: vendorOrder.deliveredAt,
          statusChangedAt: vendorOrder.updatedAt,
          windowDays: env.REFUND_WINDOW_DAYS,
        }),
        currency: vendorOrder.currency,
        subtotalAmount: vendorOrder.subtotalAmount,
        deliveryAmount: vendorOrder.deliveryAmount,
        discountAmount: vendorOrder.discountAmount,
        grandTotalAmount: vendorOrder.grandTotalAmount,
        warehouse: {
          inboundShipment: vendorOrder.inboundShipment
            ? {
                id: vendorOrder.inboundShipment.id,
                status: vendorOrder.inboundShipment.status,
                trackingRef: vendorOrder.inboundShipment.trackingRef,
                shippedAt: vendorOrder.inboundShipment.shippedAt?.toISOString() ?? null,
                receivedAt: vendorOrder.inboundShipment.receivedAt?.toISOString() ?? null,
                createdAt: vendorOrder.inboundShipment.createdAt.toISOString(),
                updatedAt: vendorOrder.inboundShipment.updatedAt.toISOString(),
              }
            : null,
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
        items: vendorOrder.items,
      })),
    };
  }
}
