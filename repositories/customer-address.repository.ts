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
}
