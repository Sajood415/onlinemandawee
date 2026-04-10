import { prisma } from "@/lib/db/prisma";

export class VendorAgreementAcceptanceRepository {
  upsert(input: {
    vendorProfileId: string;
    agreedToVendorTerms: boolean;
    agreedToMembershipPolicy: boolean;
    agreedToCommissionPolicy: boolean;
    agreedToDisputePolicy: boolean;
    agreedToDeliveryRules: boolean;
  }) {
    return prisma.vendorAgreementAcceptance.upsert({
      where: {
        vendorProfileId: input.vendorProfileId,
      },
      update: {
        agreedToVendorTerms: input.agreedToVendorTerms,
        agreedToMembershipPolicy: input.agreedToMembershipPolicy,
        agreedToCommissionPolicy: input.agreedToCommissionPolicy,
        agreedToDisputePolicy: input.agreedToDisputePolicy,
        agreedToDeliveryRules: input.agreedToDeliveryRules,
        acceptedAt: new Date(),
      },
      create: {
        vendorProfileId: input.vendorProfileId,
        agreedToVendorTerms: input.agreedToVendorTerms,
        agreedToMembershipPolicy: input.agreedToMembershipPolicy,
        agreedToCommissionPolicy: input.agreedToCommissionPolicy,
        agreedToDisputePolicy: input.agreedToDisputePolicy,
        agreedToDeliveryRules: input.agreedToDeliveryRules,
        acceptedAt: new Date(),
      },
    });
  }
}
