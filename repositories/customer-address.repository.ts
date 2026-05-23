import { prisma } from "@/lib/db/prisma";

export class CustomerAddressRepository {
  findById(id: string) {
    return prisma.customerAddress.findUnique({
      where: { id },
    });
  }

  listByUserId(userId: string) {
    return prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  unsetDefaultsForUser(userId: string) {
    return prisma.customerAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  create(input: {
    userId: string;
    label?: string | null;
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
    isDefault: boolean;
  }) {
    return prisma.customerAddress.create({
      data: {
        userId: input.userId,
        label: input.label ?? null,
        fullName: input.fullName,
        phone: input.phone,
        addressLine1: input.addressLine1,
        city: input.city,
        country: input.country,
        postalCode: input.postalCode,
        isDefault: input.isDefault,
      },
    });
  }

  update(input: {
    id: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
    isDefault: boolean;
  }) {
    return prisma.customerAddress.update({
      where: { id: input.id },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        addressLine1: input.addressLine1,
        city: input.city,
        country: input.country,
        postalCode: input.postalCode,
        isDefault: input.isDefault,
      },
    });
  }
}
