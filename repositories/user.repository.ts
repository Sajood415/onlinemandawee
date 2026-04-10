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
}
