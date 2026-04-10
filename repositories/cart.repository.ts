import { prisma } from "@/lib/db/prisma";

export class CartRepository {
  findByUserId(userId: string) {
    return prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendorProfile: true,
                category: true,
              },
            },
          },
        },
      },
    });
  }

  create(input: { userId: string; currency: string }) {
    return prisma.cart.create({
      data: {
        userId: input.userId,
        currency: input.currency,
      },
      include: {
        items: true,
      },
    });
  }

  updateCurrency(id: string, currency: string) {
    return prisma.cart.update({
      where: { id },
      data: { currency },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendorProfile: true,
                category: true,
              },
            },
          },
        },
      },
    });
  }
}
