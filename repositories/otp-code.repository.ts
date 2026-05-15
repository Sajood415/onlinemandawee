import type { OtpPurpose } from "@/domain/auth/otp-purpose";
import { prisma } from "@/lib/db/prisma";

export class OtpCodeRepository {
  invalidateActiveForPhone(phone: string, purpose: OtpPurpose) {
    return prisma.otpCode.deleteMany({
      where: {
        phone,
        purpose,
        consumedAt: null,
      },
    });
  }

  invalidateActiveForEmail(email: string, purpose: OtpPurpose) {
    return prisma.otpCode.deleteMany({
      where: { phone: email, purpose },
    });
  }

  create(input: {
    phone?: string | null;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
  }) {
    return prisma.otpCode.create({
      data: { ...input, consumedAt: null },
    });
  }

  findLatestActiveForPhone(phone: string, purpose: OtpPurpose) {
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

  findLatestActiveForEmail(email: string, purpose: OtpPurpose) {
    return prisma.otpCode.findFirst({
      where: {
        phone: email,
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

  findLatestForEmail(email: string, purpose: OtpPurpose) {
    return prisma.otpCode.findFirst({
      where: {
        phone: email,
        purpose,
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
