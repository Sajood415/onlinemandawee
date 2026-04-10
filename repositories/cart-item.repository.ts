import { prisma } from "@/lib/db/prisma";

export class CartItemRepository {
  findById(id: string) {
    return prisma.cartItem.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            vendorProfile: true,
            category: true,
          },
        },
        cart: true,
      },
    });
  }

  findByCartAndProduct(cartId: string, productId: string) {
    return prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
      include: {
        product: {
          include: {
            vendorProfile: true,
            category: true,
          },
        },
      },
    });
  }

  create(input: {
    cartId: string;
    productId: string;
    vendorProfileId: string;
    quantity: number;
    currencySnapshot: string;
    unitPriceSnapshot: number;
    productNameSnapshot: string;
    productImageSnapshot?: string;
  }) {
    return prisma.cartItem.create({
      data: {
        cartId: input.cartId,
        productId: input.productId,
        vendorProfileId: input.vendorProfileId,
        quantity: input.quantity,
        currencySnapshot: input.currencySnapshot,
        unitPriceSnapshot: input.unitPriceSnapshot,
        productNameSnapshot: input.productNameSnapshot,
        productImageSnapshot: input.productImageSnapshot ?? null,
      },
      include: {
        product: {
          include: {
            vendorProfile: true,
            category: true,
          },
        },
      },
    });
  }

  update(input: {
    id: string;
    quantity: number;
    currencySnapshot: string;
    unitPriceSnapshot: number;
    productNameSnapshot: string;
    productImageSnapshot?: string;
  }) {
    return prisma.cartItem.update({
      where: { id: input.id },
      data: {
        quantity: input.quantity,
        currencySnapshot: input.currencySnapshot,
        unitPriceSnapshot: input.unitPriceSnapshot,
        productNameSnapshot: input.productNameSnapshot,
        productImageSnapshot: input.productImageSnapshot ?? null,
      },
      include: {
        product: {
          include: {
            vendorProfile: true,
            category: true,
          },
        },
      },
    });
  }

  delete(id: string) {
    return prisma.cartItem.delete({
      where: { id },
    });
  }

  deleteManyByCartId(cartId: string) {
    return prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }
}
