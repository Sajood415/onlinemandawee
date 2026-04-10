import { prisma } from "@/lib/db/prisma";

export class UserRepository {
  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findByPhone(phone: string) {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  findByIdentifier(identifier: string) {
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
        ],
      },
    });
  }

  createCustomer(input: {
    fullName: string;
    email: string;
    phone: string;
    passwordHash: string;
  }) {
    return prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        passwordHash: input.passwordHash,
        role: "CUSTOMER",
        status: "ACTIVE",
        isPhoneVerified: true,
      },
    });
  }

  createVendor(input: {
    fullName: string;
    email: string;
    phone: string;
    passwordHash: string;
  }) {
    return prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        passwordHash: input.passwordHash,
        role: "VENDOR",
        status: "PENDING",
        isPhoneVerified: true,
      },
    });
  }

  updateLastLogin(id: string, lastLoginAt: Date) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt },
    });
  }

  updateStatus(id: string, status: "ACTIVE" | "PENDING" | "BLOCKED") {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  listAll() {
    return prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  listByRole(role: "CUSTOMER" | "VENDOR" | "ADMIN") {
    return prisma.user.findMany({
      where: { role },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
