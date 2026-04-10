import type { KycDocumentType } from "@/domain/vendor/vendor-types";
import { prisma } from "@/lib/db/prisma";

export class VendorKycDocumentRepository {
  upsert(input: {
    vendorProfileId: string;
    documentType: KycDocumentType;
    documentUrl: string;
    selfieWithIdUrl?: string;
  }) {
    return prisma.vendorKycDocument.upsert({
      where: {
        vendorProfileId_documentType: {
          vendorProfileId: input.vendorProfileId,
          documentType: input.documentType,
        },
      },
      update: {
        documentType: input.documentType,
        documentUrl: input.documentUrl,
        selfieWithIdUrl: input.selfieWithIdUrl ?? null,
        reviewStatus: "PENDING",
        reviewedAt: null,
        reviewedByUserId: null,
        rejectionReason: null,
      },
      create: {
        vendorProfileId: input.vendorProfileId,
        documentType: input.documentType,
        documentUrl: input.documentUrl,
        selfieWithIdUrl: input.selfieWithIdUrl ?? null,
      },
    });
  }
}
