import type { AuthenticatedUser } from "@/domain/auth/authenticated-user";
import { AppError } from "@/lib/errors/app-error";
import { ERROR_CODE } from "@/lib/errors/error-codes";
import { AuditLogRepository } from "@/repositories/audit-log.repository";
import { CartItemRepository } from "@/repositories/cart-item.repository";
import { CartRepository } from "@/repositories/cart.repository";
import { ProductRepository } from "@/repositories/product.repository";

type CartWithRelations = NonNullable<
  Awaited<ReturnType<CartRepository["findByUserId"]>>
>;

export class CartService {
  constructor(
    private readonly cartRepository = new CartRepository(),
    private readonly cartItemRepository = new CartItemRepository(),
    private readonly productRepository = new ProductRepository(),
    private readonly auditLogRepository = new AuditLogRepository()
  ) {}

  async getCart(auth: AuthenticatedUser) {
    this.assertActiveCustomer(auth);
    const cart = await this.ensureCart(auth.id);
    return this.serializeCart(cart);
  }

  async updateCartCurrency(auth: AuthenticatedUser, currency: string) {
    this.assertActiveCustomer(auth);
    const cart = await this.ensureCart(auth.id);
    const updated = await this.cartRepository.updateCurrency(cart.id, currency);
    return this.serializeCart(updated);
  }

  async addItem(
    auth: AuthenticatedUser,
    input: {
      productId: string;
      quantity: number;
    }
  ) {
    this.assertActiveCustomer(auth);
    const cart = await this.ensureCart(auth.id);
    const product = await this.requireSellableProduct(input.productId);
    this.assertStock(product.stockQty, input.quantity);

    const existingItem = await this.cartItemRepository.findByCartAndProduct(
      cart.id,
      product.id
    );

    if (existingItem) {
      const nextQuantity = existingItem.quantity + input.quantity;
      this.assertStock(product.stockQty, nextQuantity);

      const updated = await this.cartItemRepository.update({
        id: existingItem.id,
        quantity: nextQuantity,
        currencySnapshot: product.currency,
        unitPriceSnapshot: product.priceAmount,
        productNameSnapshot: product.name,
        productImageSnapshot: product.images[0],
      });

      await this.auditLogRepository.create({
        actorUserId: auth.id,
        actorRole: auth.role,
        action: "cart.item_updated",
        entityType: "CartItem",
        entityId: updated.id,
      });
    } else {
      const created = await this.cartItemRepository.create({
        cartId: cart.id,
        productId: product.id,
        vendorProfileId: product.vendorProfileId,
        quantity: input.quantity,
        currencySnapshot: product.currency,
        unitPriceSnapshot: product.priceAmount,
        productNameSnapshot: product.name,
        productImageSnapshot: product.images[0],
      });

      await this.auditLogRepository.create({
        actorUserId: auth.id,
        actorRole: auth.role,
        action: "cart.item_added",
        entityType: "CartItem",
        entityId: created.id,
      });
    }

    const refreshedCart = await this.ensureCart(auth.id);
    return this.serializeCart(refreshedCart);
  }

  async updateItem(
    auth: AuthenticatedUser,
    cartItemId: string,
    quantity: number
  ) {
    this.assertActiveCustomer(auth);
    const cart = await this.ensureCart(auth.id);
    const cartItem = await this.cartItemRepository.findById(cartItemId);

    if (!cartItem || cartItem.cartId !== cart.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Cart item not found",
        statusCode: 404,
      });
    }

    const product = await this.requireSellableProduct(cartItem.productId);
    this.assertStock(product.stockQty, quantity);

    const updated = await this.cartItemRepository.update({
      id: cartItem.id,
      quantity,
      currencySnapshot: product.currency,
      unitPriceSnapshot: product.priceAmount,
      productNameSnapshot: product.name,
      productImageSnapshot: product.images[0],
    });

    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "cart.item_updated",
      entityType: "CartItem",
      entityId: updated.id,
    });

    const refreshedCart = await this.ensureCart(auth.id);
    return this.serializeCart(refreshedCart);
  }

  async removeItem(auth: AuthenticatedUser, cartItemId: string) {
    this.assertActiveCustomer(auth);
    const cart = await this.ensureCart(auth.id);
    const cartItem = await this.cartItemRepository.findById(cartItemId);

    if (!cartItem || cartItem.cartId !== cart.id) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Cart item not found",
        statusCode: 404,
      });
    }

    await this.cartItemRepository.delete(cartItemId);
    await this.auditLogRepository.create({
      actorUserId: auth.id,
      actorRole: auth.role,
      action: "cart.item_removed",
      entityType: "CartItem",
      entityId: cartItemId,
    });

    const refreshedCart = await this.ensureCart(auth.id);
    return this.serializeCart(refreshedCart);
  }

  private async ensureCart(userId: string) {
    const existingCart = await this.cartRepository.findByUserId(userId);

    if (existingCart) {
      return existingCart;
    }

    await this.cartRepository.create({
      userId,
      currency: "USD",
    });

    const createdCart = await this.cartRepository.findByUserId(userId);

    if (!createdCart) {
      throw new AppError({
        code: ERROR_CODE.INTERNAL_SERVER_ERROR,
        message: "Failed to initialize cart",
        statusCode: 500,
      });
    }

    return createdCart;
  }

  private async requireSellableProduct(productId: string) {
    const product = await this.productRepository.findById(productId);

    if (
      !product ||
      product.approvalStatus !== "APPROVED" ||
      !product.isActive ||
      product.vendorProfile.status !== "ACTIVE"
    ) {
      throw new AppError({
        code: ERROR_CODE.NOT_FOUND,
        message: "Product not available",
        statusCode: 404,
      });
    }

    return product;
  }

  private assertStock(stockQty: number, requestedQty: number) {
    if (requestedQty > stockQty) {
      throw new AppError({
        code: ERROR_CODE.BAD_REQUEST,
        message: "Requested quantity exceeds available stock",
        statusCode: 400,
      });
    }
  }

  private assertActiveCustomer(auth: AuthenticatedUser) {
    if (auth.status !== "ACTIVE") {
      throw new AppError({
        code: ERROR_CODE.FORBIDDEN,
        message: "Only active customers can manage carts",
        statusCode: 403,
      });
    }
  }

  private serializeCart(cart: CartWithRelations) {
    const items = cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      vendorProfileId: item.vendorProfileId,
      vendorStoreSlug: item.product.vendorProfile.storeSlug,
      vendorStoreName: item.product.vendorProfile.storeName,
      categoryId: item.product.categoryId,
      categoryName: item.product.category.name,
      quantity: item.quantity,
      currency: item.currencySnapshot,
      unitPrice: item.unitPriceSnapshot,
      lineTotal: item.unitPriceSnapshot * item.quantity,
      productName: item.productNameSnapshot,
      productImage: item.productImageSnapshot,
      productApprovalStatus: item.product.approvalStatus,
      productIsActive: item.product.isActive,
      availableStockQty: item.product.stockQty,
      snapshotChanged:
        item.currencySnapshot !== item.product.currency ||
        item.unitPriceSnapshot !== item.product.priceAmount ||
        item.productNameSnapshot !== item.product.name,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return {
      id: cart.id,
      currency: cart.currency,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      items,
    };
  }
}
