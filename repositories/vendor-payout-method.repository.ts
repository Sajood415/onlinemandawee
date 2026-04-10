import type { PayoutMethodType } from "@/domain/vendor/vendor-types";
import { prisma } from "@/lib/db/prisma";

export class VendorPayoutMethodRepository {
  upsert(input: {
    vendorProfileId: string;
    method: PayoutMethodType;
    accountName?: string;
    accountNumberOrIban?: string;
    bankName?: string;
    paypalEmail?: string;
    stripeEmail?: string;
  }) {
    return prisma.vendorPayoutMethod.upsert({
      where: {
        vendorProfileId: input.vendorProfileId,
      },
      update: {
        method: input.method,
        accountName: input.accountName ?? null,
        accountNumberOrIban: input.accountNumberOrIban ?? null,
        bankName: input.bankName ?? null,
        paypalEmail: input.paypalEmail ?? null,
        stripeEmail: input.stripeEmail ?? null,
      },
      create: {
        vendorProfileId: input.vendorProfileId,
        method: input.method,
        accountName: input.accountName ?? null,
        accountNumberOrIban: input.accountNumberOrIban ?? null,
        bankName: input.bankName ?? null,
        paypalEmail: input.paypalEmail ?? null,
        stripeEmail: input.stripeEmail ?? null,
      },
    });
  }
}
