import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import type { VendorOrderStatus } from "@/domain/order/order-status";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { generateOpaqueToken } from "@/lib/utils/crypto";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { CartItemRepository } from "@/repositories/cart-item.repository";
import { CartRepository } from "@/repositories/cart.repository";
import { CustomerAddressRepository } from "@/repositories/customer-address.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { VendorProfileRepository } from "@/repositories/vendor-profile.repository";
import { DeliveryPricingService } from "@/services/delivery-pricing.service";

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
  vendorGroups: Array<{
    vendorProfileId: string;
    vendorStoreSlug: string | null;
    vendorStoreName: string | null;
    subtotalSnapshot: number;
    subtotalCurrent: number;
    deliveryAmount: number;
    items: QuoteLine[];
  }>;
};

export class OrderService {
  constructor(
    private readonly cartRepository = new CartRepository(),
    private readonly cartItemRepository = new CartItemRepository(),
    private readonly customerAddressRepository = new CustomerAddressRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly vendorProfileRepository = new VendorProfileRepository(),
    private readonly auditLogRepository = new AuditLogRepository(),
    private readonly deliveryPricingService = new DeliveryPricingService()
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
      vendorOrders: quote.vendorGroups.map((vendorGroup) => ({
        vendorProfileId: vendorGroup.vendorProfileId,
        currency: quote.currency,
        subtotalAmount: vendorGroup.subtotalCurrent,
        deliveryAmount: vendorGroup.deliveryAmount,
        discountAmount: 0,
        grandTotalAmount: vendorGroup.subtotalCurrent + vendorGroup.deliveryAmount,
        items: vendorGroup.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          currency: quote.currency,
          unitPriceAmount: item.currentUnitPrice,
          lineTotalAmount: item.currentLineTotal,
          productName: item.productName,
          productImage: item.productImage,
          productSku: item.productSku,
          vendorProfileId: item.vendorProfileId,
          categoryId: item.categoryId,
        })),
      })),
    });

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

    return this.getOrderForCustomer(auth, order.id);
  }

  async listMyOrders(auth: AuthenticatedUser) {
    this.assertActiveCustomer(auth);
    const orders = await this.orderRepository.listByUserId(auth.id);
    return orders.map((order) => this.serializeOrder(order));
  }

  async getOrderForCustomer(auth: AuthenticatedUser, orderId: string) {
    this.assertActiveCustomer(auth);
    const order = await this.orderRepository.findById(orderId);

    if (!order || order.userId !== auth.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Order not found",
        statusCode: 404,
      });
    }

    return this.serializeOrder(order);
  }

  async listVendorOrders(auth: AuthenticatedUser) {
    const vendor = await this.requireActiveVendor(auth.id);
    const vendorOrders = await this.orderRepository.listByVendorProfileId(vendor.id);

    return vendorOrders.map((vendorOrder) => ({
      id: vendorOrder.id,
      status: vendorOrder.status,
      currency: vendorOrder.currency,
      subtotalAmount: vendorOrder.subtotalAmount,
      deliveryAmount: vendorOrder.deliveryAmount,
      discountAmount: vendorOrder.discountAmount,
      grandTotalAmount: vendorOrder.grandTotalAmount,
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

    this.assertVendorOrderTransition(vendorOrder.status, status);

    if (
      status !== "CANCELLED" &&
      vendorOrder.order.paymentStatus !== "PAID" &&
      vendorOrder.order.paymentStatus !== "PARTIALLY_REFUNDED"
    ) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Only paid orders can move into fulfillment",
        statusCode: 400,
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
      },
    });

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

    const vendorGroups = Object.values(
      items.reduce<Record<string, QuoteResult["vendorGroups"][number]>>(
        (accumulator, item) => {
          const key = item.vendorProfileId;

          if (!accumulator[key]) {
            accumulator[key] = {
              vendorProfileId: item.vendorProfileId,
              vendorStoreSlug: item.vendorStoreSlug ?? null,
              vendorStoreName: item.vendorStoreName ?? null,
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
    const deliveryQuote = await this.deliveryPricingService.quote({
      method: input.method,
      countryCode: address.country,
      currency,
      distanceKm: input.distanceKm,
      items: items.map((item) => ({
        vendorProfileId: item.vendorProfileId,
        quantity: item.quantity,
        currentLineTotal: item.currentLineTotal,
      })),
      vendorGroups: vendorGroups.map((vendorGroup) => ({
        vendorProfileId: vendorGroup.vendorProfileId,
        subtotalCurrent: vendorGroup.subtotalCurrent,
      })),
    });
    const deliveryTotal = deliveryQuote.totalAmount;

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
      vendorGroups: vendorGroups.map((vendorGroup) => ({
        ...vendorGroup,
        deliveryAmount:
          deliveryQuote.breakdown.find(
            (entry) => entry.vendorProfileId === vendorGroup.vendorProfileId
          )?.amount ?? 0,
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
      vendorStatuses.some((status) => status === "SHIPPED" || status === "DELIVERED") ||
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
        vendorUser: "user" in vendorOrder.vendorProfile
          ? {
              id: vendorOrder.vendorProfile.user.id,
              fullName: vendorOrder.vendorProfile.user.fullName,
              email: vendorOrder.vendorProfile.user.email,
              phone: vendorOrder.vendorProfile.user.phone,
            }
          : null,
        status: vendorOrder.status,
        currency: vendorOrder.currency,
        subtotalAmount: vendorOrder.subtotalAmount,
        deliveryAmount: vendorOrder.deliveryAmount,
        discountAmount: vendorOrder.discountAmount,
        grandTotalAmount: vendorOrder.grandTotalAmount,
        items: vendorOrder.items,
      })),
    };
  }
}
