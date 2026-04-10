import type { OtpPurpose } from "@/domain/auth/otp-purpose";
import { prisma } from "@/lib/db/prisma";

export class OtpCodeRepository {
  invalidateActive(phone: string, purpose: OtpPurpose) {
    return prisma.otpCode.deleteMany({
      where: {
        phone,
        purpose,
        consumedAt: null,
      },
    });
  }

  create(input: {
    phone: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
  }) {
    return prisma.otpCode.create({
      data: input,
    });
  }

  findLatestActive(phone: string, purpose: OtpPurpose) {
    return prisma.otpCode.findFirst({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  incrementAttempts(id: string) {
    return prisma.otpCode.update({
      where: { id },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  consume(id: string) {
    return prisma.otpCode.update({
      where: { id },
      data: {
        consumedAt: new Date(),
      },
    });
  }
}
